export interface StatusUpdate {
  id: string;
  number: number;
  title: string;
  date?: string;
  content: StatusUpdateSection[];
}

export interface StatusUpdateSection {
  type: "heading" | "paragraph" | "list" | "orderedList" | "figure" | "references" | "table" | "description";
  level?: 1 | 2 | 3 | 4;
  text?: string;
  items?: string[] | { term: string; description: string }[];
  images?: { src: string; alt: string }[];
  caption?: string;
  references?: { key: string; text: string }[];
  table?: { headers: string[]; rows: (string | number)[][]; caption?: string };
}

export const STATUS_UPDATES: StatusUpdate[] = [
  {
    id: "01",
    number: 1,
    title: "Initial Phase - Literature Review and Baseline Models",
    date: "Bi-weekly update",
    content: [
      {
        type: "heading",
        level: 2,
        text: "Progress",
      },
      {
        type: "heading",
        level: 3,
        text: "Read Literature",
      },
      {
        type: "paragraph",
        text: "In the initial phase of the literature review, I primarily focused on gaining a comprehensive overview of existing research and the current directions in the field. The reviews by Lago et al. (2021), O'Connor et al. (2025), and Nowotarski and Weron (2018) clearly show a shift from classical statistical models to deep learning. They also emphasize the importance of probabilistic forecasting to better assess the increasing volatility caused by renewable energy sources. Two interesting and promising directions I encountered are the use of Transformer architectures (Llorente et al., 2025) and Mixture Density Networks (MDN) to generate probabilistic outputs (Brusaferri et al., 2020).",
      },
      {
        type: "heading",
        level: 3,
        text: "Completed Work",
      },
      {
        type: "paragraph",
        text: "In an initial practical phase, I implemented and tested three baseline models:",
      },
      {
        type: "list",
        items: [
          "Lasso Estimated AutoRegressive (LEAR) model",
          "LEAR combined with a Variational Gaussian Process (LEAR+VGP)",
          "A standard Deep Neural Network (DNN)",
        ],
      },
      {
        type: "heading",
        level: 3,
        text: "Key Findings",
      },
      {
        type: "paragraph",
        text: "The analysis of the results yielded two important insights.",
      },
      {
        type: "paragraph",
        text: "First, the results from the LEAR model show that performance clearly deteriorates as the test period progresses. At the beginning of the test set, the model still performs reasonably well, but towards the end, the error increases noticeably. This indicates that the model cannot properly model long-term trends.",
      },
      {
        type: "figure",
        images: [
          { src: "/status-updates/update1/lear_results_begin.png", alt: "LEAR predictions at beginning of test set" },
          { src: "/status-updates/update1/lear_results_einde.png", alt: "LEAR predictions at end of test set" },
        ],
        caption: "Predictions from the LEAR model. Top: a sample from the beginning of the test set. Bottom: a sample from the end of the test set. The decrease in accuracy is clearly visible.",
      },
      {
        type: "paragraph",
        text: "Second, both the LEAR model and the DNN have difficulty correctly predicting the timing and magnitude of extreme price peaks. This is an important problem, as such peaks are expected to become even more frequent due to the further integration of renewable energy sources into the electricity grid.",
      },
      {
        type: "figure",
        images: [{ src: "/status-updates/update1/dnn_results.png", alt: "DNN predictions showing difficulty with price peaks" }],
        caption: "Predictions from the DNN model, which also struggles with modeling price peaks.",
      },
      {
        type: "heading",
        level: 3,
        text: "Next Steps",
      },
      {
        type: "paragraph",
        text: "Given the limitations of the current models, and aligned with my own interests, I want to focus on a more advanced deep learning approach that is explicitly designed for probabilistic forecasting in the next phase.",
      },
      {
        type: "paragraph",
        text: "The method I currently have in mind is a hybrid model that combines a Transformer architecture with a Mixture Density Network (MDN):",
      },
      {
        type: "list",
        items: [
          "Transformer-backbone: The Transformer (Llorente et al., 2025) is chosen because of its ability to model complex, long-term dependencies in time series and integrate exogenous variables. This should help address the shortcomings of the LEAR model. The transformer would also allow the use of exogenous variables, which could have performance benefits.",
          "MDN-output layer: By using an MDN as an output layer (Brusaferri et al., 2020), the model can predict a full probability distribution instead of a single value. This allows the model to better handle the multi-modal nature of electricity prices and also explicitly quantify uncertainty.",
        ],
      },
      {
        type: "paragraph",
        text: "This combination seems like a logical next step to develop a more robust model that is better adapted to the current behavior of energy markets. At this point, this hybrid approach seems most promising, but this is more of a starting point than a definitive choice. In the next phase, I want to evaluate whether this direction effectively delivers the expected benefits (for a more recent dataset) and test additional models to better compare results.",
      },
      {
        type: "heading",
        level: 3,
        text: "Literature Status Update 01",
      },
      {
        type: "references",
        references: [
          { key: "lago2021review", text: "Lago et al. (2021) - Electricity price forecasting review" },
          { key: "oconnor2025review", text: "O'Connor et al. (2025) - Electricity price forecasting review" },
          { key: "nowotarski2018advances", text: "Nowotarski & Weron (2018) - Advances in electricity price forecasting" },
          { key: "llorente2025transformer", text: "Llorente et al. (2025) - Transformer for electricity price forecasting" },
          { key: "brusaferri2020probabilistic", text: "Brusaferri et al. (2020) - Probabilistic forecasting with MDN" },
        ],
      },
    ],
  },
  {
    id: "02",
    number: 2,
    title: "21/10-04/11",
    date: "Literature review and experimental work",
    content: [
      { type: "heading", level: 2, text: "Literature Review" },
      {
        type: "paragraph",
        text: "During this period, I have read the following new articles:",
      },
      {
        type: "list",
        items: [
          "Wen et al. - Comprehensive survey on the use of Transformers in time series forecasting",
          "Vaswani et al. - Original \"Attention Is All You Need\" paper that introduced the Transformer architecture",
          "Cantillo-Luna et al. - Probabilistic Transformer architecture for intra-day electricity price forecasting",
        ],
      },
      {
        type: "paragraph",
        text: "The article by Wen et al. provides a comprehensive overview of how Transformers are applied in time series forecasting, which is highly relevant to my research. The original Transformer paper by Vaswani et al. is essential for understanding the foundations of the architecture. The article by Cantillo-Luna et al. is particularly interesting because it specifically uses Transformers for electricity price forecasting with a probabilistic approach, which directly aligns with my planned methodology.",
      },
      { type: "heading", level: 2, text: "Experimental Work" },
      { type: "heading", level: 3, text: "Price Distribution Analysis" },
      {
        type: "paragraph",
        text: "Following the last meeting, I began by analyzing the price distribution of the new dataset (2019-2025). I evaluated several candidate distributions (Normal, Log-Normal, Student's t, Johnson S_U, Skew Normal, Gamma, Weibull minimum) to model the price distribution. Based on both visual inspection and the Akaike Information Criterion (AIC), the Johnson S_U distribution provided the best fit. The Johnson S_U distribution is a transformation of the Normal distribution, where a variable X is defined from a standard normal variable Z ~ N(0,1) by the relationship X = ε + λ · sinh((Z−γ)/δ).",
      },
      {
        type: "figure",
        images: [{ src: "/status-updates/update2/price_distribution_comparison.png", alt: "Real distribution of prices compared to best 4 fits" }],
        caption: "Real distribution of the prices compared to the best 4 fits",
      },
      { type: "heading", level: 3, text: "Probabilistic Transformer Implementation and Initial Results" },
      {
        type: "paragraph",
        text: "I proceeded to implement a probabilistic transformer model that outputs the four parameters (γ, λ, δ, and ε) of the Johnson S_U distribution. Initial testing on the new dataset yielded disappointing results, with MAE values in the range of 10-20, compared to the previous dataset where MAE values were often below 10. I then compared both non-probabilistic and probabilistic models on both datasets. This comparison clearly demonstrates degraded performance on the new dataset, which led me to further investigate the underlying causes.",
      },
      {
        type: "figure",
        images: [{ src: "/status-updates/update2/compare_datasets_metrics.png", alt: "Metrics on probabilistic and non-probabilistic transformer, old vs new dataset" }],
        caption: "Various metrics tested on probabilistic and non-probabilistic transformer, on both old and new dataset.",
      },
      { type: "heading", level: 3, text: "Volatile Period Analysis and Impact on Model Performance" },
      {
        type: "paragraph",
        text: "Upon plotting the price data over time, a highly volatile period becomes evident, starting in late 2021 and extending into early 2023. This volatility likely stems from the European energy crisis, which was triggered by post-COVID demand recovery, reduced Russian gas supply, and further increased by the war in Ukraine and subsequent sanctions on Russian gas imports.",
      },
      {
        type: "figure",
        images: [{ src: "/status-updates/update2/price_over_time_anomaly.png", alt: "Price over time with volatile period marked" }],
        caption: "Price over time, with the interesting volatile period marked in grey",
      },
      {
        type: "paragraph",
        text: "I suspected that including this volatile period in the training data would adversely affect model performance, as it exhibits different characteristics compared to the periods both before and after. To test this hypothesis, I trained the Probabilistic Transformer (PT) exclusively on data from the post-volatile period (2023-2024). This approach resulted in a 5-10% performance improvement compared to training on the full dataset (2019-2024). While this improvement is not insignificant, it was smaller than anticipated given the apparent volatility of the period. These slightly disappointing results may be attributed to the substantially reduced amount of training data available when excluding the volatile period, which limits the model's ability to learn robust patterns.",
      },
      {
        type: "table",
        table: {
          caption: "Metric comparison: model with volatile period vs. model trained on post-volatile period only",
          headers: ["Metric", "Model WITH Volatile", "Model AFTER Volatile Only", "Improvement (%)"],
          rows: [
            ["MAE", 12.3955, 11.0543, 10.82],
            ["RMSE", 17.5161, 15.8596, 9.46],
            ["MAPE (%)", 1857.48, 1426.07, 23.23],
            ["MBE", 6.6207, 2.6066, 60.63],
            ["MAE (%)", 16.9731, 15.1366, 10.82],
            ["RMSE (%)", 23.9846, 21.7164, 9.46],
          ],
        },
      },
      { type: "heading", level: 3, text: "Market Evolution Analysis" },
      {
        type: "paragraph",
        text: "I conducted a more in-depth analysis comparing how the market has evolved relative to the dataset used in previous work (2011-2016), as this could provide insights for developing better models. Prices have become substantially more volatile in recent years. The distribution has also changed markedly, exhibiting longer and taller tails, a narrower center, and an increased frequency of negative prices. The data shows that the mean price has increased from 44.10 to 104.34 EUR/MWh, representing a 136.57% increase. The standard deviation has increased even more dramatically, from 22.66 EUR/MWh in the old dataset to 97.65 EUR/MWh in the new dataset, an increase of 330.87%. This increase in volatility is likely partially attributable to the growing share of renewable energy, which has risen from 7.87% in 2011-2016 to 17.16% in 2020-2025, an increase of 118.02%. Notably, the price-renewable correlation has also strengthened, changing from -0.089 to -0.283, indicating a more pronounced inverse relationship between renewable generation and prices. This all indicates that we will need a more robust model that can deal with this more volatile behaviour, as well as the changing market dynamics in the recent dataset.",
      },
      {
        type: "figure",
        images: [{ src: "/status-updates/update2/time_series_period_comparison.png", alt: "Time series graph for period 1 and period 2" }],
        caption: "Time series graph for period 1 and period 2",
      },
      {
        type: "figure",
        images: [{ src: "/status-updates/update2/price_distribution_comparison2.png", alt: "Price distribution histogram for both periods" }],
        caption: "Price distribution histogram for both periods",
      },
      { type: "heading", level: 3, text: "Model Performance Comparison with Exogenous Variables" },
      {
        type: "paragraph",
        text: "I updated all models to incorporate exogenous variables (using the same variables as in previous work: Generation forecast in France and System Load Forecast) and compared their performance by training on the full new dataset. The results are presented in the table below. These results should be interpreted with caution, as most of my time has been dedicated to the Probabilistic Transformer, and thus it is expected that this model would show better performance. Additionally, it is currently the only model adapted for probabilistic forecasting. Nevertheless, the Probabilistic Transformer demonstrates promising results, which suggests potential for further performance improvements with additional tuning.",
      },
      {
        type: "table",
        table: {
          caption: "Model Performance Metrics",
          headers: ["Model Name", "MAE", "RMSE", "MAPE (%)", "sMAPE (%)"],
          rows: [
            ["Probabilistic Transformer", 11.68, 16.87, 919.32, 29.42],
            ["SVM", 13.08, 19.32, 1688.31, 30.38],
            ["LSTM", 13.99, 19.68, 1802.61, 31.82],
            ["Transformer", 14.78, 19.82, 1462.01, 33.18],
            ["XGBoost", 16.17, 24.37, 1917.97, 34.15],
            ["LEAR", 16.30, 24.56, 1823.39, 33.92],
            ["DNN", 18.88, 25.40, 2653.08, 37.71],
            ["KNN", 20.33, 27.52, 2094.38, 39.46],
            ["HoltWinters", 39.96, 54.67, 9639.99, 51.01],
          ],
        },
      },
      { type: "heading", level: 2, text: "Further Steps" },
      {
        type: "list",
        items: [
          "Try a mixture of distributions as output head (not per se Johnson SU, also try Gaussian, Student t, …)",
          "Try an ensemble of models, since SVM and LSTM also seemed to perform well",
          "Optimize other models further, also implementing their probabilistic counterparts to do a fair comparison",
          "Try extra exogenous variables like renewable data, NL data, Load imbalance, Generation Imbalance, …",
        ],
      },
      {
        type: "references",
        references: [
          { key: "wen2023survey", text: "Wen et al. - Transformers in time series forecasting survey" },
          { key: "vaswani2023attention", text: "Vaswani et al. - Attention Is All You Need" },
          { key: "cantillo2023", text: "Cantillo-Luna et al. - Probabilistic Transformer for intra-day electricity price forecasting" },
        ],
      },
    ],
  },
  {
    id: "03",
    number: 3,
    title: "05/11-24/11",
    date: "Lag configuration, output head, and preprocessing optimization",
    content: [
      {
        type: "paragraph",
        text: "During this period, I focused on optimizing the probabilistic transformer model by systematically testing different configurations for three main components: lag selection, output head architecture, and preprocessing methods. The goal was to find the best combination that gives good point forecasts while also providing well-calibrated uncertainty estimates.",
      },
      {
        type: "paragraph",
        text: "I started by testing different lag configurations to see how much historical data the model needs and in what format. Then I compared different ways to output probabilistic forecasts (Monte Carlo Dropout, Quantile Loss, and distributional heads). Finally, I tested various preprocessing methods to see how data transformation affects performance.",
      },
      {
        type: "paragraph",
        text: "The main findings are: (1) using the last 72 hours plus 12 weekly anchors works best for lags, (2) Gaussian 3-component distributional head gives the best point forecasts with perfect calibration (PICP = 0.95), and (3) QuantileTransformer Normal preprocessing improves performance the most.",
      },
      { type: "heading", level: 2, text: "Lag Configuration Design" },
      {
        type: "paragraph",
        text: "I tested ten different lag-selection strategies to see how much historical data the model needs and whether dense recent data or sparse seasonal patterns work better. The configurations are:",
      },
      {
        type: "description",
        items: [
          { term: "recent_72h", description: "Last 72 hours (3 days) of data" },
          { term: "recent_336h", description: "Last 336 hours (2 weeks) of data" },
          { term: "hybrid_recent_and_daily", description: "Last 24 hours plus weekly samples from the past month" },
          { term: "recent_24h", description: "Last 24 hours only" },
          { term: "recent_168h", description: "Last 168 hours (1 week)  the baseline we used before" },
          { term: "short_term_3h", description: "Last 3 hours only" },
          { term: "daily_same_hour_200d", description: "Same hour from the past 200 days" },
          { term: "daily_same_hour_90d", description: "Same hour from the past 90 days" },
          { term: "weekly_same_hour_26w", description: "Same hour from the past 26 weeks" },
          { term: "weekly_same_hour_52w", description: "Same hour from the past 52 weeks (1 year)" },
        ],
      },
      { type: "heading", level: 2, text: "Experimental Results" },
      {
        type: "paragraph",
        text: "All models used the same hyperparameters and were trained on data from 2023-2025 (after the volatile period). Results are in the table below.",
      },
      {
        type: "table",
        table: {
          caption: "Lag configuration comparison (lower MAE/RMSE is better).",
          headers: ["Configuration", "# Lags", "Max Lag", "Fit (s)", "Predict (s)", "MAE", "RMSE"],
          rows: [
            ["recent_72h", 72, 72, 448.7, 295.5, 10.68, 16.59],
            ["recent_336h", 336, 336, 2060.2, 300.5, 11.04, 16.85],
            ["hybrid_recent_and_daily", 28, 672, 294.2, 294.3, 11.28, 17.47],
            ["recent_24h", 24, 24, 275.0, 293.3, 11.49, 17.49],
            ["recent_168h", 168, 168, 1032.8, 295.5, 11.53, 17.26],
            ["short_term_3h", 3, 3, 170.0, 292.3, 11.89, 19.37],
            ["daily_same_hour_200d", 200, 4800, 684.7, 298.8, 22.91, 32.09],
            ["daily_same_hour_90d", 90, 2160, 301.6, 296.2, 23.36, 33.06],
            ["weekly_same_hour_26w", 26, 4368, 132.3, 293.7, 27.13, 40.29],
            ["weekly_same_hour_52w", 52, 8736, 202.3, 294.8, 44.68, 64.17],
          ],
        },
      },
      { type: "heading", level: 3, text: "Initial Findings" },
      {
        type: "paragraph",
        text: "The recent_72h configuration performed best with MAE 10.68 and RMSE 16.59, beating the baseline 168-hour window while using fewer lags and training faster. This shows that the most recent 2-3 days contain the most important information.",
      },
      {
        type: "paragraph",
        text: "Expanding to two weeks (recent_336h) only slightly improved RMSE but doubled training time. Very short windows (24h or 3h) performed worse, showing we need at least 2-3 days of history. Seasonal-only sampling (daily or weekly patterns without recent data) performed badly, with errors getting worse as the maximum lag increased.",
      },
      {
        type: "paragraph",
        text: "Based on these results, I did a more focused search combining dense recent data with weekly seasonal anchors.",
      },
      { type: "heading", level: 3, text: "Refined Configuration Exploration" },
      {
        type: "paragraph",
        text: "I tested combinations of dense recent data with weekly seasonal anchors. Configurations like recent_72h_plus_weekly8 use the last 72 hours plus the same hour from the previous 8 weeks. Results are in the table below.",
      },
      {
        type: "table",
        table: {
          caption: "Refined lag configuration comparison.",
          headers: ["Configuration", "# Lags", "Max Lag", "Fit (s)", "Predict (s)", "MAE", "RMSE"],
          rows: [
            ["recent_72h_plus_weekly8", 80, 1344, 561.3, 294.2, 10.56, 16.60],
            ["hybrid_recent_weekly26", 122, 4368, 675.7, 295.6, 10.82, 16.88],
            ["hybrid_recent_dense_daily", 80, 1344, 537.4, 293.8, 10.86, 17.80],
            ["recent_48h_plus_weekly12", 60, 2016, 400.6, 293.2, 10.87, 16.78],
            ["recent_72h_plus_daily30", 86, 720, 554.3, 294.0, 10.99, 17.33],
            ["recent_24h_plus_daily14", 37, 336, 351.1, 292.2, 11.22, 17.63],
            ["recent_120h", 120, 120, 538.7, 306.0, 11.72, 17.70],
            ["recent_240h", 240, 240, 1166.1, 296.6, 11.77, 17.69],
            ["recent_288h", 288, 288, 1533.3, 298.2, 12.09, 18.23],
            ["recent_96h", 96, 96, 553.5, 289.3, 12.30, 19.31],
          ],
        },
      },
      { type: "heading", level: 3, text: "Final Optimization Sweep" },
      {
        type: "paragraph",
        text: "I tested more combinations focusing on 36-96 hour windows with 4-12 weekly anchors to find the best balance. Results are in the table below.",
      },
      {
        type: "table",
        table: {
          caption: "Window length and weekly anchor sweep (best-performing subset).",
          headers: ["Configuration", "# Lags", "Max Lag", "Fit (s)", "Predict (s)", "MAE", "RMSE"],
          rows: [
            ["recent_36h_plus_weekly4", 40, 672, 352.5, 286.8, 10.78, 16.56],
            ["recent_36h_plus_weekly8", 44, 1344, 375.4, 289.4, 10.51, 16.42],
            ["recent_36h_plus_weekly12", 48, 2016, 380.5, 290.2, 10.35, 16.16],
            ["recent_48h_plus_weekly4", 52, 672, 428.6, 290.6, "10.32*", "15.95*"],
            ["recent_48h_plus_weekly8", 56, 1344, 435.2, 291.2, 11.10, 17.66],
            ["recent_48h_plus_weekly12", 60, 2016, 399.9, 291.2, 10.92, 16.71],
            ["recent_60h_plus_weekly4", 64, 672, 433.5, 292.0, 10.71, 16.94],
            ["recent_60h_plus_weekly8", 68, 1344, 487.0, 292.4, 10.77, 16.55],
            ["recent_60h_plus_weekly12", 72, 2016, 491.7, 292.6, 10.97, 16.77],
            ["recent_72h_plus_weekly4", 76, 672, 561.8, 292.8, 11.46, 16.63],
            ["recent_72h_plus_weekly8", 80, 1344, 561.1, 292.8, 10.59, 16.33],
            ["recent_72h_plus_weekly12", 84, 2016, 489.2, 292.6, 10.87, 16.05],
            ["recent_84h_plus_weekly4", 88, 672, 531.3, 292.8, 12.76, 18.84],
            ["recent_84h_plus_weekly8", 92, 1344, 563.8, 294.1, 13.45, 19.22],
            ["recent_84h_plus_weekly12", 96, 2016, 466.7, 293.1, 11.53, 18.34],
            ["recent_96h_plus_weekly4", 100, 672, 601.8, 292.4, 12.44, 18.68],
            ["recent_96h_plus_weekly8", 104, 1344, 654.0, 293.5, 11.45, 17.59],
            ["recent_96h_plus_weekly12", 108, 2016, 573.9, 292.4, 10.39, 16.37],
          ],
        },
      },
      { type: "heading", level: 3, text: "Conclusion and Recommendation" },
      {
        type: "paragraph",
        text: "The pattern across all experiments is clear: dense coverage of the last 2-3 days plus a few weekly anchors works best. recent_48h_plus_weekly4 has the best MAE (10.32) and RMSE (15.95), but recent_72h_plus_weekly12 is more robust with good performance (MAE 10.87, RMSE 16.05) and reasonable training time (~489s).",
      },
      {
        type: "paragraph",
        text: "Compared to the baseline recent_168h, this gives a 6% reduction in MAE and 7% reduction in RMSE while cutting training time by more than 50%. I'll use recent_72h_plus_weekly12 as the default lag configuration for future experiments.",
      },
      { type: "heading", level: 2, text: "Output Head Architecture Comparison" },
      {
        type: "paragraph",
        text: "After finding the best lag configuration, I wanted to test different ways to output probabilistic forecasts from the transformer. The goal was to see which approach works best for capturing uncertainty while still getting good point forecasts. I tested eleven different configurations across three main approaches: Monte Carlo Dropout, Quantile Loss regression, and Distributional heads (Gaussian and Johnson SU with different numbers of mixture components).",
      },
      { type: "heading", level: 3, text: "Experimental Setup" },
      {
        type: "paragraph",
        text: "All models used the same recent_72h_plus_weekly12 lag configuration and were evaluated on 5,829 test points. I tested: (1) Monte Carlo Dropout, (2) Quantile Loss with 3, 5, 7, and 9 quantiles, (3) Gaussian heads with 1, 2, and 3 components, and (4) Johnson SU heads with 1, 2, and 3 components.",
      },
      {
        type: "figure",
        images: [{ src: "/status-updates/update3/head_comparison.png", alt: "Comparison of output head architectures across multiple metrics" }],
        caption: "Comparison of output head architectures across multiple metrics. Top row shows point forecast metrics (MAE, RMSE), middle row shows probabilistic coverage metrics (PICP, MPIW), and bottom row shows scoring metrics (Interval Score, CRPS). Lower values are better for all metrics except PICP, where values closer to 0.95 indicate better calibration.",
      },
      { type: "heading", level: 3, text: "Results" },
      {
        type: "paragraph",
        text: "The results show clear differences between the three approaches, as you can see in the table and figure below.",
      },
      {
        type: "table",
        table: {
          caption: "Output head architecture comparison results. Best values in each metric category are highlighted.",
          headers: ["Configuration", "MAE", "RMSE", "PICP", "MPIW", "Interval Score", "CRPS"],
          rows: [
            ["MCDropout", 14.26, 20.72, 0.692, 30.49, 170.46, 9.88],
            ["QuantileLoss_3quantiles", 13.93, 20.57, 0.929, 70.96, 106.59, 10.79],
            ["QuantileLoss_5quantiles", 12.91, 19.34, 0.904, 55.89, 104.89, 9.49],
            ["QuantileLoss_7quantiles", 14.53, 21.38, 0.942, 75.31, 101.96, 10.35],
            ["QuantileLoss_9quantiles", 12.95, 19.56, 0.942, 70.19, 104.72, 9.80],
            ["Gaussian_1components", 12.23, 19.02, 0.961, 74.24, 104.36, 9.62],
            ["Gaussian_2components", 14.40, 20.60, 0.932, 66.57, 102.05, 10.88],
            ["Gaussian_3components", 11.45, 18.80, 0.950, 65.88, 97.09, 10.42],
            ["Johnson_su_1components", 12.75, 20.41, 0.964, 80.43, 108.91, 9.15],
            ["Johnson_su_2components", 11.74, 18.97, 0.950, 63.86, 94.74, 9.89],
            ["Johnson_su_3components", 12.72, 18.61, 0.946, 67.93, 90.99, 9.82],
          ],
        },
      },
      {
        type: "paragraph",
        text: "Monte Carlo Dropout performed worst overall. While it had decent CRPS values (9.88), its PICP of 0.692 means the 95% prediction intervals only captured about 69% of actual values, which is way too low. The Interval Score of 170.46 was also the worst. It seems like dropout-based uncertainty estimation doesn't work well for this transformer setup.",
      },
      {
        type: "paragraph",
        text: "Quantile Loss regression showed mixed results. The 5-quantile version had the best MAE (12.91) and RMSE (19.34) among quantile methods, but the 9-quantile version was close behind (12.95 MAE, 19.56 RMSE). Interestingly, the 7-quantile version had worse point forecast accuracy (14.53 MAE, 21.38 RMSE) but better PICP (0.942). The 3-quantile version performed worst, which makes sense since it doesn't capture enough of the uncertainty distribution.",
      },
      {
        type: "paragraph",
        text: "Distributional heads showed interesting patterns. For Gaussian models, the 3-component version performed best with the lowest MAE (11.45) and RMSE (18.80), and also the best Interval Score (97.09). It also has the best PICP (0.950), which is exactly at the target of 0.95. The 1-component version has higher PICP (0.961) but that's actually overcoverage, meaning the intervals are too wide. The 2-component version was somewhere in between. This suggests that using multiple mixture components can actually help, contrary to what I initially thought.",
      },
      {
        type: "paragraph",
        text: "For Johnson SU models, the results are interesting. The 2-component version has the best MAE (11.74) and the best PICP (0.950), which matches the target perfectly. The 3-component version has the best RMSE (18.61) and the best Interval Score (90.99). The 1-component version has higher PICP (0.964) but that's overcoverage. So it seems like using more mixture components helps, with the 2-component version giving the best calibration (PICP exactly at 0.95) and the 3-component version giving the best overall probabilistic performance (lowest Interval Score).",
      },
      { type: "heading", level: 3, text: "Conclusion" },
      {
        type: "paragraph",
        text: "The Gaussian 3-component model has the best MAE (11.45) and perfect calibration (PICP = 0.950). The Johnson SU 2-component also has perfect calibration and good MAE (11.74). The Johnson SU 3-component has the best RMSE (18.61) and Interval Score (90.99).",
      },
      {
        type: "paragraph",
        text: "Interestingly, mixture components do help, the 3-component Gaussian and 2-3 component Johnson SU models perform better than single-component versions. For now, I'll use the Gaussian 3-component model since it has the best point forecasts and perfect calibration.",
      },
      { type: "heading", level: 2, text: "Preprocessing Methods Comparison" },
      {
        type: "paragraph",
        text: "After finding the best lag configuration and output head, I tested fourteen preprocessing methods to see how data transformation affects performance. I used the recent_72h_plus_weekly12 lag configuration with Johnson SU output head and tested various scaling and transformation methods. Results are in the table below.",
      },
      {
        type: "table",
        table: {
          caption: "Preprocessing methods comparison results. Methods are sorted by MAE (ascending). Best values in each metric category are highlighted.",
          headers: ["Method", "MAE", "RMSE", "MAPE", "PICP", "MPIW", "Interval Score", "CRPS"],
          rows: [
            ["QuantileTransformer_Normal", 11.63, 18.22, 939.26, 0.932, 63.29, 88.57, 19.94],
            ["YeoJohnson_Gaussian", 12.54, 19.83, 1622.10, 0.957, 71.33, 105.31, 18.96],
            ["Wavelet_Daubechies4", 12.56, 19.83, 1332.02, 0.939, 63.27, 100.14, 20.41],
            ["StandardScaler (default)", 12.78, 20.83, 1767.33, 0.902, 55.42, 110.13, 20.48],
            ["YeoJohnson_JohnsonSU", 13.23, 20.46, 1845.95, 0.962, 80.47, 110.54, 21.46],
            ["LogTransform", 13.36, 19.67, 2073.02, 0.941, 69.78, 98.09, 19.95],
            ["PowerTransformer", 13.44, 21.80, 1720.25, 0.941, 71.03, 109.09, 20.41],
            ["BoxCoxTransform", 13.58, 20.02, 2010.42, 0.909, 62.90, 101.92, 19.89],
            ["RobustScaler", 14.55, 21.22, 1455.50, 0.941, 79.26, 113.42, 21.90],
            ["QuantileTransformer_Uniform", 15.55, 30.11, 4644.36, 0.954, 135.76, 156.47, 21.09],
          ],
        },
      },
      { type: "heading", level: 3, text: "Results and Conclusion" },
      {
        type: "paragraph",
        text: "QuantileTransformer_Normal performed best overall with the lowest MAE (11.63) and RMSE (18.22), and the best Interval Score (88.57). It transforms data to a normal distribution, which seems to work well with the transformer architecture.",
      },
      {
        type: "paragraph",
        text: "Some methods performed identically: StandardScaler, Wavelet methods, and NoPreprocessing all got the same results (MAE 12.78, RMSE 20.83), suggesting wavelets don't add much value here.",
      },
      {
        type: "paragraph",
        text: "YeoJohnson_Gaussian had the best PICP (0.957), showing that matching preprocessing to the output head distribution can help, but the point forecast accuracy is still worse than QuantileTransformer_Normal.",
      },
      {
        type: "paragraph",
        text: "QuantileTransformer_Uniform performed worst (RMSE 30.11), showing that transforming to a uniform distribution destroys important information for forecasting.",
      },
      {
        type: "paragraph",
        text: "I'll use QuantileTransformer_Normal as the default preprocessing method since it gives the best overall performance.",
      },
      { type: "heading", level: 2, text: "Next Steps" },
      {
        type: "list",
        items: [
          "Code cleanup: Clean up and organize the code I wrote, make sure everything is well-documented, and remove any temporary or experimental code that's no longer needed.",
          "Verify results: Go through the results more carefully, double-check the metrics, and make sure everything makes sense. I should also verify that the models are actually using the configurations I think they are (like checking that mixture components are really being used).",
          "Read more papers: Spend more time reading papers to get a deeper mathematical understanding of the methods I'm using. This will help me better interpret the results and understand why certain approaches work better than others.",
        ],
      },
    ],
  },
  {
    id: "04",
    number: 4,
    title: "After literature study and exam period",
    date: "25/11-19/02: Refactoring, methodology refinement, and Ornstein-Uhlenbeck experiments",
    content: [
      {
        type: "paragraph",
        text: "After the literature study and the exam period, I focused on code quality, paying attention to a robust methodology, and extending the probabilistic transformer with stochastic differential equations.",
      },
      { type: "heading", level: 2, text: "Code Refactoring and Modular Design" },
      {
        type: "paragraph",
        text: "In the previous semester, I ran many experiments that led to fragmented and hard-to-maintain code, which was not optimal for the experiments I wanted to perform. I therefore refactored the entire codebase from scratch with a modular design tailored to the experiments I want to perform.",
      },
      {
        type: "paragraph",
        text: "The new architecture separates concerns clearly:",
      },
      {
        type: "list",
        items: [
          "Lag configurations: Configurable lag selection strategies (e.g., recent windows, weekly anchors, daily samplings) can be swapped without touching the rest of the pipeline.",
          "Preprocessing: Data transformations (StandardScaler, QuantileTransformer, Yeo-Johnson, etc.) are implemented as interchangeable components.",
          "Output heads: Different probabilistic output heads (Gaussian mixture, Johnson SU mixture, quantile loss, Monte Carlo dropout) are modular and can be compared systematically.",
        ],
      },
      {
        type: "paragraph",
        text: "This modular design makes it easier to run controlled experiments and reuse components across different model configurations.",
      },
      { type: "heading", level: 2, text: "Reimplemented Notebooks with Repeatable Methodology" },
      {
        type: "paragraph",
        text: "I reimplemented the notebooks to follow a clean, repeatable experimental methodology. Key changes include:",
      },
      {
        type: "list",
        items: [
          "Multiple training runs: Each experiment is repeated multiple times (e.g., 10 runs) to account for statistical variability and report mean metrics with confidence.",
          "Fixed train/test splits: The same training and test data are used across all experiments for fair comparison.",
          "Consistent prediction count: The same number of predictions is generated in each run to ensure comparable evaluation.",
        ],
      },
      {
        type: "paragraph",
        text: "These practices improve the reliability and reproducibility of the results, as the different configuration became problematic in the previous codebase.",
      },
      { type: "heading", level: 2, text: "Probabilistic Baseline Models" },
      {
        type: "paragraph",
        text: "To have a fair comparison with the probabilistic transformer, I implemented and optimized probabilistic versions of several baseline models: LSTM, DeepAR, N-BEATS, XGBoost, LightGBM, and QLEAR. These baselines are trained and evaluated using the same pipeline, data splits, and methodology as the transformer experiments. Parameter optimization has been performed for each model. Results from these baseline comparisons will hopefully be available for the next meeting.",
      },
      { type: "heading", level: 2, text: "Experiment Execution Status" },
      {
        type: "paragraph",
        text: "Many of the refactored experiments are still running because of their computational cost. I expect to have more detailed results for the next meeting, including:",
      },
      {
        type: "list",
        items: [
          "Comparison across lag configurations, preprocessing methods, and output heads using the new modular pipeline.",
          "Performance metrics from multiple runs to assess statistical significance.",
          "Baseline comparison with the probabilistic models (LSTM, DeepAR, N-BEATS, XGBoost, LightGBM, QLEAR).",
        ],
      },
      { type: "heading", level: 2, text: "Ornstein-Uhlenbeck Stochastic Differential Equations" },
      {
        type: "paragraph",
        text: "I am experimenting with adding Stochastic Differential Equations (SDEs) to the transformer to improve short-term variability modeling, inspired by the approach of Zhang et al. Specifically, I integrated the Ornstein-Uhlenbeck (OU) process into a hybrid probabilistic transformer.",
      },
      {
        type: "paragraph",
        text: "The OU process models mean-reverting dynamics and is commonly used in finance and energy markets to capture short-term fluctuations around a trend. In the hybrid setup:",
      },
      {
        type: "orderedList",
        items: [
          "The transformer predicts the main trend.",
          "Residuals (actual minus predicted) are modeled with an OU process, whose parameters (k, μ, σ) are estimated via Maximum Likelihood.",
          "The final forecast combines the transformer trend with the OU mean-reversion component.",
        ],
      },
      {
        type: "paragraph",
        text: "This approach aims to better capture the short-term variability and mean-reversion behaviour of electricity prices, since the transformer-only approach still seemed to struggle with short-term variability. Experiments comparing the standard probabilistic transformer with the hybrid OU-enhanced version are also ongoing; I hope to have results at the next meeting.",
      },
      { type: "heading", level: 2, text: "Next Steps" },
      {
        type: "list",
        items: [
          "Complete the running experiments and analyse the results.",
          "Continue refining the Ornstein-Uhlenbeck hybrid transformer and evaluate its impact on probabilistic performance.",
          "Document and finalise the best configurations (lag, preprocessing, output head) from the refactored experiments.",
        ],
      },
      {
        type: "references",
        references: [
          { key: "zhang2025transformerou", text: "Zhang et al. - Transformer with Ornstein-Uhlenbeck process" },
        ],
      },
    ],
  },
  {
    id: "05",
    number: 5,
    title: "Structure and Methodology of the Experimental Notebooks",
    date: "Data split, experiments overview, and key results",
    content: [
      { type: "heading", level: 2, text: "Data Split" },
      {
        type: "paragraph",
        text: "All notebooks use the same train/validation/test split. Training starts from 2023-02-01. The test set is the last 6 months of the dataset. Validation is the last 10% of the training period (before the test split). Because the dataset ends in February 2026, the test set runs from approximately August 2025 to February 2026, and validation is the last 10% of the period from 2023-02-01 to July 2025.",
      },
      { type: "heading", level: 2, text: "Experiments" },
      { type: "heading", level: 3, text: "Notebook 4: Probabilistic Transformer Head Study" },
      {
        type: "paragraph",
        text: "This notebook compares different head types:",
      },
      {
        type: "list",
        items: [
          "Gaussian: symmetric normal distribution",
          "Johnson SU: four-parameter distribution that can capture skewness and heavy tails",
          "Mixture of Gaussians: 1, 2, 3, or 5 components",
          "Mixture of Johnson SU: 1, 2, 3, or 5 components",
          "Quantile regression: direct prediction of quantiles (9, 19, 29, …, 99 quantiles)",
        ],
      },
      {
        type: "paragraph",
        text: "Each configuration is run 10 times to account for statistical variability. The table below gives the results, sorted by mean MAE, including point-forecast metrics (MAE, RMSE), probabilistic metrics (PICP, MPIW, Interval Score, CRPS), and quantile metrics (average pinball loss).",
      },
      {
        type: "table",
        table: {
          caption: "Probabilistic head study results",
          headers: ["Configuration", "MAE (mean ± std)", "RMSE", "Fit (s)", "PICP", "MPIW", "Int. Score", "CRPS", "Avg. Pinball"],
          rows: [
            ["JSU-Mix-5", "20.49 ± 0.90", 27.84, 76.9, 0.913, 96.2, 150.3, 15.23, 6.79],
            ["GMM-5", "20.55 ± 0.77", 27.92, 77.4, 0.920, 97.1, 147.4, 15.31, 6.81],
            ["JSU-Mix-2", "20.58 ± 1.26", 28.04, 75.2, 0.923, 100.1, 150.0, 15.12, 6.74],
            ["GMM-2", "20.72 ± 0.78", 27.93, 76.9, 0.929, 100.5, 144.0, 15.38, 6.82],
            ["JohnsonSU", "20.72 ± 0.81", 27.98, 69.8, 0.935, 109.2, 150.0, 15.17, "/"],
            ["GMM-3", "20.84 ± 1.13", 28.15, 73.2, 0.935, 104.8, 147.9, 15.61, 6.93],
            ["JSU-Mix-3", "20.85 ± 1.24", 28.31, 76.6, 0.895, 91.2, 158.2, 15.49, 6.93],
            ["Quantile-99", "21.05 ± 0.69", 28.66, 81.5, 0.907, 97.0, 157.8, 15.55, 6.99],
            ["Quantile-9", "21.18 ± 1.16", 28.69, 84.1, 0.805, 73.2, 210.3, 15.97, 7.09],
            ["Quantile-89", "21.33 ± 0.73", 28.86, 81.4, 0.895, 95.6, 169.8, 15.81, 7.13],
            ["Quantile-49", "21.57 ± 0.82", 29.04, 82.7, 0.904, 99.7, 162.8, 15.95, 7.16],
            ["Gaussian", "21.59 ± 0.61", 28.70, 66.9, 0.942, 117.0, 154.4, 15.93, "/"],
            ["Quantile-29", "21.61 ± 0.62", 29.18, 88.0, 0.861, 88.3, 183.8, 16.15, 7.29],
            ["Quantile-19", "21.65 ± 0.75", 29.40, 82.2, 0.857, 85.6, 188.5, 16.16, 7.25],
            ["Quantile-79", "21.67 ± 1.06", 29.36, 84.1, 0.883, 96.6, 182.4, 16.20, 7.33],
            ["Quantile-39", "21.73 ± 0.62", 29.57, 78.1, 0.901, 98.0, 167.6, 16.03, 7.21],
            ["Quantile-59", "21.83 ± 1.06", 29.72, 88.9, 0.859, 88.5, 194.8, 16.49, 7.49],
            ["Quantile-69", "21.90 ± 0.95", 29.44, 81.2, 0.907, 103.4, 169.2, 16.18, 7.28],
          ],
        },
      },
      {
        type: "paragraph",
        text: "The best-performing head is JSU-Mix-5 (5-component Johnson SU mixture), with mean MAE 20.49, RMSE 27.84, CRPS 15.23, and the lowest average pinball loss (6.79). GMM-5 and JSU-Mix-2 rank second and third on MAE, which shows that the mixture models find the multi-modal or skewed nature of electricity prices better than single distributions. Since JSU-Mix-5 and GMM-5 performed best, exploring more components would be the next step but this has not been done in this update because of time constraints. The Johnson SU models dominate the top performers on MAE, probably because the skewness and heavy tails in price data can be better modeled with it.",
      },
      { type: "heading", level: 3, text: "Notebook 5: Transformer Preprocessing Study" },
      {
        type: "paragraph",
        text: "This notebook evaluates 20 different preprocessing methods for the input and target variables. The preprocessing is applied before feeding the data to the Probabilistic Transformer. Standard scaling is used as the baseline.",
      },
      {
        type: "paragraph",
        text: "The methods include:",
      },
      {
        type: "list",
        items: [
          "Transformations: Box-Cox, Yeo-Johnson",
          "Scaling: robust scaling, MAD scaling, quantile transformer",
          "Decomposition: STL (trend/seasonality removal), wavelet decomposition, variational mode decomposition",
          "Stationarisation: differencing",
          "Feature engineering: scarcity indicators, residual load, cyclical time encoding, boolean flags",
          "Robustness: winsorisation, rolling window scaling, noise injection",
        ],
      },
      {
        type: "paragraph",
        text: "Each configuration is run 5 times. The table below summarises the results, sorted by MAE (best first).",
      },
      {
        type: "table",
        table: {
          caption: "Preprocessing study results, sorted by MAE. PICP: Prediction Interval Coverage Probability; MPIW: Mean Prediction Interval Width. Arcsinh and MirrorLog produced invalid outputs (omitted).",
          headers: ["Method", "MAE", "RMSE", "PICP", "MPIW", "Int. Score", "CRPS", "Fit (s)"],
          rows: [
            ["ResidualLoad", 20.43, 27.88, 0.918, 99.5, 154.4, 14.98, 47.8],
            ["WaveletDecomposition", 20.54, 27.69, 0.915, 99.3, 151.7, 15.23, 48.0],
            ["CyclicalEncoding", 20.73, 27.93, 0.933, 109.9, 151.5, 15.08, 46.4],
            ["NoiseInjection", 20.77, 28.13, 0.917, 103.2, 155.9, 15.29, 48.4],
            ["ScarcityIndicators", 20.77, 28.38, 0.924, 102.8, 154.9, 15.43, 46.7],
            ["BooleanFlags", 20.84, 28.26, 0.929, 106.4, 151.9, 15.29, 47.5],
            ["YeoJohnson", 21.21, 28.41, 0.936, 120.3, 158.5, 15.67, 45.8],
            ["Baseline (standard scaling)", 21.27, 28.81, 0.912, 101.9, 163.1, 15.79, 46.9],
            ["VMDDecomposition", 21.42, 28.77, 0.937, 111.8, 152.2, 15.60, 46.4],
            ["STLDecomposition", 21.43, 28.85, 0.922, 107.3, 159.4, 15.48, 48.4],
            ["ProbIntegralTransform", 21.57, 34.68, 0.934, 208.4, 241.9, 17.72, 60.9],
            ["QuantileGaussian", 21.79, 29.93, 0.927, 113.3, 158.1, 15.82, 48.9],
            ["Winsorization", 22.27, 30.18, 0.906, 120.3, 175.8, 16.16, 55.7],
            ["RobustScaling", 22.33, 30.35, 0.906, 112.7, 193.9, 16.65, 50.3],
            ["RollingWindowScaling", 25.54, 34.07, 0.840, 102.2, 236.8, 19.37, 47.2],
            ["MADScaling", 34.40, 45.81, 0.950, 187.0, 240.2, 26.56, 49.5],
            ["BoxCox", 40.03, 52.52, 0.992, 251.2, 257.8, "/", 40.8],
          ],
        },
      },
      {
        type: "paragraph",
        text: "The best-performing preprocessing is ResidualLoad (load-renewables), with MAE 20.43, RMSE 27.88, CRPS 14.98, and Interval Score 154.4. WaveletDecomposition and MixUp (data augmentation) rank second and third. MixUp achieves the best Interval Score (151.3), meaning it balances coverage and sharpness. Feature-engineering methods (ResidualLoad, ScarcityIndicators, CyclicalEncoding, BooleanFlags) seem to always outperform the baseline, indicating that these domain-specific features capture knowledge in the data. In a next step I can try combinations of preprocessing methods to see if their benefits add up.",
      },
      { type: "heading", level: 3, text: "Notebook 6: Probabilistic Models Benchmark Study" },
      {
        type: "paragraph",
        text: "This notebook benchmarks several probabilistic forecasting models on the same dataset and evaluation setup:",
      },
      {
        type: "list",
        items: [
          "Probabilistic Transformer (Johnson SU and quantile heads)",
          "Probabilistic LSTM (Johnson SU and quantile heads)",
          "Probabilistic DeepAR (Johnson SU and quantile heads)",
          "XGBoost (quantile regression)",
          "LightGBM (quantile regression)",
          "Persistence Residual (baseline)",
        ],
      },
      {
        type: "paragraph",
        text: "To have a fair comparison the methodology I used was:",
      },
      {
        type: "orderedList",
        items: [
          "Optimization: Each model's hyperparameters are optimised. Deep learning models were optimized for both distributional and quantile heads (these results were obtained in parallel with notebook 4 and thus it was not yet known that mixtures performed much better than quantiles, thus in a next phase I might also test mixtures here).",
          "Comparison: Optimized models are evaluated on the test set.",
          "Robustness: Stochastic models are run 10 times to diminish statistical variability.",
          "Metrics: MAE, RMSE, CRPS, PICP, MPIW, Interval Score.",
        ],
      },
      {
        type: "table",
        table: {
          caption: "Probabilistic models benchmark results",
          headers: ["Model", "MAE", "RMSE", "PICP", "MPIW", "Int. Score", "CRPS"],
          rows: [
            ["LightGBM", 16.88, 23.52, 0.924, 93.6, 129.0, 4.88],
            ["XGBoost", 17.04, 23.65, 0.917, 87.1, 126.0, 4.85],
            ["Transformer (quantile)", 20.96, 28.32, 0.823, 74.7, 196.3, 15.70],
            ["DeepAR (johnson_su)", 21.16, 28.62, 0.934, 103.0, 141.4, 15.79],
            ["LSTM (quantile)", 21.48, 29.36, 0.866, 78.8, 166.5, 15.73],
            ["DeepAR (quantile)", 21.53, 29.41, 0.833, 73.2, 182.5, 15.87],
            ["Transformer (johnson_su)", 21.75, 29.38, 0.897, 98.3, 168.5, 16.13],
            ["LSTM (johnson_su)", 22.05, 29.92, 0.912, 101.6, 160.1, 16.48],
            ["PersistenceResidual", 39.32, 52.21, 0.924, 183.4, 247.9, 11.09],
          ],
        },
      },
      {
        type: "paragraph",
        text: "GBDTs (LightGBM, XGBoost) win on MAE and CRPS while deep learning models hover around 21-22 MAE. The Transformer is optimized with Optuna, and here the quantile head outperforms the Johnson SU head on MAE (20.96 vs. 21.75), unlike in Notebook 4, where quantile heads ranked below mixture heads. This may be due to Optuna finding better hyperparameters for the quantile head in this benchmark setup, whereas the hyperparameters used in Notebook 4 were optimized for the standard Gaussian output head.",
      },
      { type: "heading", level: 3, text: "Notebook 7: Hybrid Transformer vs. Standard Transformer Comparison" },
      {
        type: "paragraph",
        text: "This notebook compares the standard Probabilistic Transformer with a hybrid variant that adds a stochastic process for the residuals to the Transformer. The goal is to test whether modelling the residuals helps forecast accuracy and the probabilistic measures.",
      },
      {
        type: "paragraph",
        text: "Standard Transformer: Predicts prices solely from the input features. The model outputs a probabilistic forecast (e.g. via a Johnson SU or mixture head).",
      },
      {
        type: "paragraph",
        text: "Hybrid Transformer:",
      },
      {
        type: "orderedList",
        items: [
          "Train the Transformer for trend prediction.",
          "Fit an Ornstein-Uhlenbeck (OU) process on the training residuals (actual-predicted).",
          "Final forecast = Transformer trend + OU mean-reversion path.",
        ],
      },
      {
        type: "paragraph",
        text: "The OU process models the residual dynamics as a mean-reverting stochastic process, capturing short-term deviations from the Transformer's trend. Both models are run 10 times to reduce statistical variability. The table below summarises the average metrics.",
      },
      {
        type: "table",
        table: {
          caption: "Hybrid vs. standard Transformer comparison (averaged over 10 runs).",
          headers: ["Model", "MAE", "RMSE", "MAPE", "R²", "Pinball (10/50/90)", "Avg Pinball"],
          rows: [
            ["Hybrid (Transformer+OU)", 24.58, 33.17, 840.7, 0.167, "5.75 / 12.11 / 6.50", 8.12],
            ["Standard Transformer", 25.92, 34.58, 834.9, 0.094, "6.77 / 12.67 / 7.41", 8.95],
          ],
        },
      },
      {
        type: "paragraph",
        text: "The hybrid model beats the standard Transformer on all metrics. This suggests that modelling residuals with an OU process both improves point forecasts and gives better calibrated quantile predictions. The mean-reverting OU component captures short-term dynamics that the Transformer alone misses, such as rapid price corrections or residual autocorrelation.",
      },
      { type: "heading", level: 3, text: "Notebook 1: Exploratory Data Analysis (BE_ENTSOE)" },
      {
        type: "paragraph",
        text: "After seeing the results of Notebook 7, this gave me the idea to go back to the basics and try to incorporate more domain knowledge into the model. I thus improved the first notebook doing exploratory data analysis of the BE_ENTSOE dataset. Of course there is a lot more plots and data analysis in the notebook, but these were the most notable results for the development of notebook 8.",
      },
      {
        type: "paragraph",
        text: "Prices distribution: The histogram, box plot, and Q-Q plot of the price variable reveal a bimodal structure with peaks at zero and near the median/mean. The Q-Q plot deviates from the normal line, indicating non-normality. This suggests non-Gaussian output heads in the standard transformer case, or experimenting with regime-switching in the SDE (e.g. different OU parameters when prices are near zero vs. positive).",
      },
      {
        type: "figure",
        images: [{ src: "/status-updates/update5/prices_distribution.png", alt: "Price distribution: histogram, box plot, and Q-Q plot" }],
        caption: "Price distribution: histogram, box plot, and Q-Q plot",
      },
      {
        type: "paragraph",
        text: "Volatility per hour: Bar chart of volatility by hour of day. Volatility peaks during morning and evening demand peaks. The SDE could use hour-dependent volatility (e.g. σ(t) as a function of hour).",
      },
      {
        type: "figure",
        images: [{ src: "/status-updates/update5/volatility_per_hour.png", alt: "Volatility by hour of day" }],
        caption: "Volatility by hour of day",
      },
      { type: "heading", level: 3, text: "Notebook 8: Electricity Price Floor & Asymmetry Techniques" },
      {
        type: "paragraph",
        text: "This notebook compares different approaches to integrate domain knowledge about electricity prices: higher positive peaks than negative, and a price floor near zero (prices unlikely to go strongly negative). The goal was to test whether enforcing or rewarding non-negativity improves forecasts.",
      },
      {
        type: "paragraph",
        text: "Distribution-head approaches:",
      },
      {
        type: "list",
        items: [
          "Baseline (Gaussian) and Baseline (Johnson SU): standard output heads without floor constraints",
          "Johnson SU + Floor: soft floor penalty and asymmetric loss during training",
          "Truncated Normal: normal distribution truncated at 0, support [0, ∞)",
        ],
      },
      {
        type: "paragraph",
        text: "Hybrid Transformer + SDE approaches:",
      },
      {
        type: "list",
        items: [
          "Hybrid (Transformer+OU): standard OU process on residuals",
          "Hybrid + Reflected OU: OU with reflection at 0",
          "Hybrid + CIR: Cox-Ingersoll-Ross process",
        ],
      },
      {
        type: "paragraph",
        text: "Each configuration is run 5 times. The table below shows the results.",
      },
      {
        type: "table",
        table: {
          caption: "Electricity price floor techniques comparison (averaged over 5 runs), sorted by MAE. PICP: Prediction Interval Coverage Probability; MPIW: Mean Prediction Interval Width; Avg. Pinball: average pinball loss across quantiles.",
          headers: ["Model", "MAE", "RMSE", "R²", "PICP", "MPIW", "Int. Score", "CRPS", "Avg. Pinball"],
          rows: [
            ["Hybrid (Transformer+OU)", 24.76, 33.15, 0.167, 0.859, 97.5, 197.7, 17.89, 8.09],
            ["Baseline (Gaussian)", 25.63, 33.52, 0.149, 0.794, 81.8, 222.2, 18.95, 8.55],
            ["Baseline (Johnson SU)", 25.69, 33.96, 0.124, 0.771, 83.7, 245.4, 19.12, 8.76],
            ["Hybrid + CIR", 25.86, 34.25, 0.112, 0.779, 86.2, 243.2, 19.25, 8.82],
            ["Johnson SU + Floor", 25.95, 34.58, 0.096, 0.746, 79.1, 266.2, 19.53, 8.98],
            ["Hybrid + Reflected OU", 26.46, 34.88, 0.079, 0.767, 89.7, 258.9, 20.48, 9.38],
            ["Truncated Normal", 27.15, 36.84, -0.027, 0.370, 44.6, 656.3, 22.72, 10.93],
          ],
        },
      },
      {
        type: "paragraph",
        text: "The Hybrid Transformer (Transformer+OU) performs best, with MAE 24.76, R² 0.167, the lowest CRPS (17.89), Interval Score (197.7), and average pinball loss (8.09). The Gaussian and Johnson SU baselines rank second and third. The floor/reflection and the CIR process did thus not help prediction errors.",
      },
      { type: "heading", level: 2, text: "Next Steps" },
      {
        type: "orderedList",
        items: [
          "As Stefano recommended previous week I still want to try non-symmetric processes like a OU with Poisson jumps",
          "Find out why models seem to perform worse than before refactoring (due to training/test set? model parameters? error while refactoring?)",
          "Refine results e.g. notebook 6 indicates that quantile head (7 quantiles) is better than JohnsonSU while notebook 4 indicates the opposite (is this due to the chosen hyperparameters?)",
          "Compare models (e.g. Transformer with mixture output head against Transformer+OU) when refitting instead of 1 inference over the 6 months of test data",
          "Rework the literature review with feedback + continue writing first chapter about the initial data analysis",
        ],
      },
    ],
  },
  {
    id: "06",
    number: 6,
    title: "MAE diff investigation, notebooks 9, 10 & 12, and writing progress",
    date: "",
    content: [
      {
        type: "paragraph",
        text: "I struggled in the first semester with visualizing and comparing the results of all my models" +
            ", since metrics don't tell you everything, " +
            "they don't tell you when the model performs well or badly, " +
            "just how it performs overall. I thought about making a dashboard back " +
            "then but it seemed it a bit out of scope for the thesis. When I saw Clément's dashboard though," +
            " I was sold on the idea, so I made this one (obviously with the help of AI) " +
            "and I've found it really valuable already for visualizing and interpreting my data." +
            " I'm also not a big fan of LaTeX, so I found it a better and more organized solution to put the status updates here as well.",
      },
      { type: "heading", level: 2, text: "MAE Difference Investigation" },
      {
        type: "paragraph",
        text: "I reran the old code with the same train/val/test set and the same hyperparameters." +
            " As expected, the resulting MAE (around 18.75) is worse than the 11-14 seen in the first semester," +
            " but it is still better than all of the basic transformers I have trained with the refactored code (all of which have a MAE of just above 20). " +
            "I first thought this might be due to the expanding window retraining done in the pre-refactored code," +
            " so I implemented notebook 11 to test this. This also did not give satisfactory results, with MAEs still above 20. " +
            "There thus still seems to be a slight advantage for the old model," +
            " so I will need to investigate further to really understand where the difference comes from.",
      },
      {
        type: "table",
        table: {
          caption: "Summary across 10 runs (mean ± std).",
          headers: ["Metric", "Value"],
          rows: [
            ["MAE", "18.75 (± 0.78)"],
            ["RMSE", "24.85 (± 0.93)"],
            ["MAD", "14.55 (± 0.70)"],
            ["CRPS", "13.43 (± 0.49)"],
            ["MPIW", "77.91 (± 7.65)"],
            ["PICP", "0.897 (± 0.032)"],
            ["Interval Score", "104.72 (± 4.70)"],
          ],
        },
      },
      { type: "heading", level: 2, text: "Notebook 9: Mixture-of-Experts" },
      {
        type: "paragraph",
        text: "Notebook 9 compares the standard Transformer (Johnson SU) against a " +
            "Mixture-of-Experts setup and a JSU mixture head. The Mixture JSU (3 components) model does best on MAE," +
            " RMSE and CRPS. The MoE architecture with separate experts doesn't beat the simpler mixture model," +
            " so the extra complexity doesn't seem to pay off for this dataset.",
      },
      {
        type: "table",
        table: {
          caption: "Mixture-of-Experts and mixture head comparison (Notebook 9).",
          headers: ["Model", "MAE", "RMSE", "R²", "PICP", "MPIW", "CRPS"],
          rows: [
            ["Mixture JSU (3 components)", 19.85, 26.66, 0.494, 0.872, 81.6, 14.48],
            ["Baseline (Johnson SU)", 20.30, 27.12, 0.477, 0.895, 93.2, 14.66],
            ["MoE Transformer (5 experts)", 20.32, 27.18, 0.474, 0.880, 87.2, 14.74],
            ["MoE Transformer (3 experts)", 20.45, 27.36, 0.467, 0.891, 89.7, 14.76],
          ],
        },
      },
      { type: "heading", level: 2, text: "Notebook 10: Loss Functions & Ensembles" },
      {
        type: "paragraph",
        text: "We tried training with different loss functions, CRPS and Pinball instead of NLL, to see if directly optimizing evaluation metrics would help. Quantile (Pinball) and Johnson SU (NLL) end up performing about the same; Gaussian CRPS does a bit worse. For ensembles, we averaged the quantile forecasts from the top models in notebook 8, and that actually works really well, best MAE (18.56) and solid PICP (0.958).",
      },
      {
        type: "table",
        table: {
          caption: "Loss functions and ensemble comparison (Notebook 10).",
          headers: ["Approach", "MAE", "RMSE", "CRPS", "PICP", "MPIW"],
          rows: [
            ["Quantile avg ensemble", 18.56, "—", "—", 0.958, 103.6],
            ["Quantile (Pinball)", 19.91, 26.47, 14.66, 0.902, 94.9],
            ["Johnson SU (NLL)", 19.98, 26.74, 14.30, 0.905, 93.9],
            ["Gaussian CRPS", 20.72, 27.46, 15.32, 0.834, 72.6],
          ],
        },
      },
      { type: "heading", level: 2, text: "Notebook 12: Lévy Processes" },
      {
        type: "paragraph",
        text: "Notebook 12 experiments with Lévy jump-diffusion processes in the Hybrid Transformer + SDE setup. It adds compound Poisson jumps on top of the OU diffusion: Gaussian jumps (symmetric, light tails), Laplace jumps (heavier tails), and asymmetric jumps. The asymmetric one is interesting since it uses two separate Poisson processes, one for upward spikes and one for downward moves, each with exponential jump sizes. So upward jumps can be larger on average than downward ones, which fits the idea that electricity prices spike up more than they drop. In practice though it ends up over-predicting uncertainty, very high PICP (99.6%) but way wider intervals and worse MAE/CRPS. The simpler Gaussian jump model does best, a small improvement over the baseline OU-only model. Laplace jumps don't add much.",
      },
      {
        type: "table",
        table: {
          caption: "Lévy process comparison (Notebook 12).",
          headers: ["Model", "MAE", "RMSE", "CRPS", "PICP", "MPIW", "Interval Score"],
          rows: [
            ["Hybrid + OU + Jump (Gaussian)", 19.76, 26.62, 14.25, 0.922, 97.1, 144.4],
            ["Hybrid (Transformer+OU)", 20.26, 27.04, 14.58, 0.935, 107.3, 146.5],
            ["Hybrid + OU + Laplace Jump", 20.62, 27.32, 14.67, 0.935, 106.9, 143.7],
            ["Hybrid + Asymmetric Jump", 21.19, 27.71, 19.79, 0.996, 251.9, 253.8],
          ],
        },
      },
      { type: "heading", level: 2, text: "Quantile vs. Johnson SU (Notebook 6 vs. 4)" },
      {
        type: "paragraph",
        text: "Notebook 6 finds the quantile head slightly better than Johnson SU while notebook 4 finds the opposite." +
            " The difference comes from the optimisation: notebook 4 uses fixed hyperparameters for all heads," +
            " while notebook 6 optimises each model separately with Optuna." +
            " So the quantile head benefits from head-specific tuning, while with shared hyperparameters Johnson SU does better " +
            "because it fits the price distribution more naturally.",
      },
      { type: "heading", level: 2, text: "Literature and Writing" },
      {
        type: "paragraph",
        text: "I've further incorporated feedback from Stefano and Chris into the literature study." +
            " I've also started writing the first chapter on the Belgian electricity market data analysis," +
            " building upon notebook 1 and the dashboard visualisations.",
      },
      { type: "heading", level: 2, text: "What next?" },
      {
        type: "paragraph",
        text: "This period was a bit shorter than normal, and combined with organising the VTK jobfair" +
            " I haven't been able to do a lot of work. After implementing the new notebooks I also didn't" +
            " quite know what to do next and don't have a lot of clear next steps. " +
            "I still need to investigate the performance difference further, which is where I'm stuck now," +
            " but other than that I'm not sure what to focus on, so I'd appreciate any input. " +
            "It just seems like the transformer on which i have been focussed from the beginning is decent from the start, " +
            "but it is hard to squeeze extra performance out of it, and it seems to be outperformed by the other models i tried. " +
            "Even with all the enhancements i tried its always close to baseline. " +
            "Even if i find something which causes the performance to be worse than before refactoring, the results would still only be marginally better than LSTM or DeepAR, and still worse than Gradient Boosting." +
            "This leaves me a bit worried for my thesis, and I am unsure what to do next. ",
      },
    ],
  },
  {
    id: "07",
    number: 7,
    title: "Notebooks 13-27: Closing the gap to LEAR",
    date: "",
    content: [
      {
        type: "paragraph",
        text: "In this update I go over notebooks 13 to 27. The main goal of this period was to improve the PyTorch Transformer, understand why LEAR is better at point forecasts, and try to close the gap between them. I also tested some alternative approaches like PatchTST, ensembles, conformal prediction, and feature engineering. At the end I will also mention which notebooks are probably not worth including in the final thesis because the results are not interesting enough.",
      },
      { type: "heading", level: 2, text: "Notebook 13: Improved PyTorch Transformer" },
      {
        type: "paragraph",
        text: "This notebook tries to find out why the PyTorch transformer has a MAE of around 19 and systematically improves it. I tested several things: using the median of the JSU distribution instead of the mean for point forecasts, an improved training recipe (AdamW optimizer, gradient clipping, cosine LR schedule, 100 epochs), and architectural changes (Pre-LayerNorm, decoder self-attention). After that I ran Optuna hyperparameter optimization (50 trials).",
      },
      {
        type: "table",
        table: {
          caption: "Progressive improvements to the PyTorch Transformer.",
          headers: ["Configuration", "MAE", "Improvement"],
          rows: [
            ["Baseline PyTorch", 19.39, "—"],
            ["+ Median forecast", 19.02, "+1.9%"],
            ["+ Improved training recipe", 17.97, "+7.3%"],
            ["+ Architecture changes", 17.94, "+7.5%"],
            ["+ Optuna HPO (50 trials, 10 runs)", 17.58, "+9.3%"],
          ],
        },
      },
      {
        type: "paragraph",
        text: "The best configuration found by Optuna uses 8 attention heads, d_model=384, 2 encoder layers, 1 decoder layer, ff_dim=128, dropout=0.174, lr=4.36e-4, and batch size 128. The improvement from 19.39 to 17.58 is decent but still far from LEAR (14.24). The training recipe changes contributed the most.",
      },
      { type: "heading", level: 2, text: "Notebooks 15 & 16: Train/Val Split and Test Window Study" },
      {
        type: "paragraph",
        text: "These two notebooks run the same grid study for both the Transformer (Nb15) and LEAR (Nb16). I tested 3 train/val split ratios (90/10, 80/20, 70/30) combined with 4 test window lengths (3, 6, 9, 12 months), giving 12 configurations each.",
      },
      {
        type: "table",
        table: {
          caption: "Best MAE per test window length for Transformer vs LEAR.",
          headers: ["Test window", "Transformer MAE", "LEAR MAE", "Gap"],
          rows: [
            ["3 months", 16.03, 14.33, 1.70],
            ["6 months", 19.35, 16.78, 2.57],
            ["9 months", 22.02, 18.09, 3.93],
            ["12 months", 20.74, 18.65, 2.09],
          ],
        },
      },
      {
        type: "paragraph",
        text: "The main findings are: (1) shorter test windows give better MAE for both models, which shows that electricity prices are non-stationary and models degrade over time, (2) more training data (90/10 split) is generally better, and (3) LEAR consistently outperforms the Transformer across all configurations. The gap ranges from 1.7 to 3.9 MAE points. This is important because it shows the gap is not just an artifact of one specific setup.",
      },
      { type: "heading", level: 2, text: "Notebook 17: LEAR-Transformer Ensemble" },
      {
        type: "paragraph",
        text: "Since both LEAR and the Transformer have different strengths, I tested combining them. I compared four approaches: standalone LEAR, standalone Transformer, a weighted average ensemble, and a residual ensemble (Transformer trained to predict LEAR's errors).",
      },
      {
        type: "table",
        table: {
          caption: "Ensemble comparison results.",
          headers: ["Model", "MAE", "CRPS", "R²"],
          rows: [
            ["Weighted average ensemble", "15.69 ± 0.53", "—", 0.678],
            ["LEAR (standalone)", 16.64, "—", 0.579],
            ["Transformer (standalone)", "18.47 ± 1.26", "13.63 ± 0.99", 0.574],
            ["Residual ensemble", "20.87 ± 2.85", "15.25 ± 2.00", 0.426],
          ],
        },
      },
      {
        type: "paragraph",
        text: "The weighted average ensemble (alpha * LEAR + (1-alpha) * Transformer, with alpha around 0.4-0.5) gives the best MAE of 15.69, which is better than both standalone models. This makes sense because LEAR is good at structured lag patterns while the Transformer captures different dynamics. The residual ensemble does not work well, the Transformer struggles to learn LEAR's error patterns. This is an important result because it shows that combining both models is a viable strategy.",
      },
      { type: "heading", level: 2, text: "Notebook 19: Rolling Recalibration" },
      {
        type: "paragraph",
        text: "LEAR recalibrates daily using a rolling window. I wondered if doing the same for the Transformer would help close the gap. I tested monthly rolling retraining with different lookback windows (6, 12, 18, 24 months).",
      },
      {
        type: "table",
        table: {
          caption: "Rolling recalibration results. All rolling variants perform worse than the baseline.",
          headers: ["Configuration", "MAE", "CRPS", "R²"],
          rows: [
            ["Baseline (train once)", 18.36, 13.63, 0.559],
            ["Rolling 6-month window", 19.35, 14.10, 0.507],
            ["Rolling 12-month window", 19.74, 14.86, 0.507],
            ["Rolling 18-month window", 20.34, 15.25, 0.487],
            ["Rolling 24-month window", 19.28, 14.91, 0.528],
            ["LEAR (daily rolling, reference)", 14.24, "—", 0.724],
          ],
        },
      },
      {
        type: "paragraph",
        text: "Rolling recalibration actually made the Transformer worse in all cases. This is a negative result but an important one: LEAR's advantage does not come from its daily recalibration strategy. The Transformer apparently needs more data to learn good patterns, and restricting the training window hurts more than it helps with adapting to recent trends.",
      },
      { type: "heading", level: 2, text: "Notebook 20: Probabilistic LEAR Baseline" },
      {
        type: "paragraph",
        text: "To fairly compare the probabilistic performance of the Transformer against LEAR, I implemented two probabilistic versions of LEAR: Conformal LEAR (wrapping LEAR point forecasts with conformal prediction intervals) and QLEAR (quantile regression version of LEAR).",
      },
      {
        type: "table",
        table: {
          caption: "Probabilistic LEAR vs Transformer comparison.",
          headers: ["Model", "MAE", "CRPS", "PICP", "MPIW"],
          rows: [
            ["Transformer (reference)", 17.40, 14.20, 0.90, 93],
            ["Conformal LEAR", 29.07, 18.41, 0.781, 88.75],
            ["QLEAR (quantile regression)", 30.49, 23.33, 0.427, 50.74],
          ],
        },
      },
      {
        type: "paragraph",
        text: "The Transformer clearly wins on probabilistic metrics with a CRPS of 14.20 vs 18.41 for Conformal LEAR and 23.33 for QLEAR. Note: the LEAR MAE values here are unusually high (29-30) because of a data leakage fix applied to the LEAR code that removed current-day features. The cached predictions may need regeneration. Despite this, the comparison is still valid for showing that the Transformer provides much better calibrated uncertainty estimates than LEAR-based probabilistic methods.",
      },
      { type: "heading", level: 2, text: "Notebook 23: Sequential Conformal Prediction" },
      {
        type: "paragraph",
        text: "This notebook applies post-hoc conformal prediction to recalibrate the Transformer's prediction intervals online, without any retraining. I tested two methods: EnbPI (using a 60-day rolling buffer) and Adaptive Conformal Prediction (ACP).",
      },
      {
        type: "table",
        table: {
          caption: "Sequential conformal prediction results. Target coverage is 95%.",
          headers: ["Method", "PICP", "MPIW", "CRPS", "MAE"],
          rows: [
            ["Uncalibrated Transformer (JSU)", 0.849, 65.12, 13.27, 17.80],
            ["EnbPI (60-day buffer)", 0.940, 90.68, 12.97, 17.80],
            ["Adaptive Conformal Prediction", 0.950, 96.48, 13.03, 17.80],
          ],
        },
      },
      {
        type: "paragraph",
        text: "This is one of the most important results. Adaptive Conformal Prediction achieves almost perfect 95% coverage (PICP = 0.950, with only 0.05% error from the target) and slightly improves CRPS, all without retraining. The point forecast (MAE) stays the same since conformal prediction only adjusts the intervals. This means we can get well-calibrated prediction intervals from the Transformer for free.",
      },
      { type: "heading", level: 2, text: "Notebook 24: V1 vs V2 Dataset Comparison" },
      {
        type: "paragraph",
        text: "I collected additional exogenous features (nuclear forecasts, wind forecasts, DE prices, balance indicators, solar forecasts) to create a V2 dataset with 37 features compared to V1's 28. I then compared Transformer performance on both.",
      },
      {
        type: "table",
        table: {
          caption: "V1 vs V2 comparison. V2 adds 9 new features.",
          headers: ["Dataset", "Overall MAE", "Low prices MAE", "Normal MAE", "High prices MAE"],
          rows: [
            ["V1 (28 features)", "18.15 ± 0.18", 28.05, 15.22, 18.96],
            ["V2 (37 features)", "19.77 ± 1.80", 21.77, 17.25, 15.11],
          ],
        },
      },
      {
        type: "paragraph",
        text: "V2 is 8.9% worse overall but shows a clear trade-off: it is much better at extreme prices (low prices: 28.05 -> 21.77, high prices: 18.96 -> 15.11) but worse at normal prices (15.22 -> 17.25). The normal regime dominates the average, so overall MAE goes up. This motivated the feature selection work in Notebook 26.",
      },
      { type: "heading", level: 2, text: "Notebooks 25 & 26: Architecture Optimization and Feature Selection" },
      {
        type: "paragraph",
        text: "Notebook 25 does a systematic sweep over regularization, model size, and learning rate schedules. Notebook 26 tests which V2 features actually help and also experiments with regime-weighted training to improve extreme price prediction.",
      },
      { type: "heading", level: 3, text: "Notebook 25: Key findings" },
      {
        type: "list",
        items: [
          "All experiments show best_epoch = 1 out of 21. The model overfits after a single epoch of training. This is the fundamental bottleneck.",
          "Regularization (weight decay, dropout, gradient clipping) does not help, because the problem is not gradual overfitting but first-epoch overshoot.",
          "Smaller models generalize better: d192_L3 (MAE=17.03, 840K params) beats d384_L2 (MAE=18.61) significantly.",
          "LR scheduling helps slightly: plateau scheduler with lr=5e-4 gives MAE=17.22.",
          "Final optimized Transformer: MAE = 18.02 ± 0.65. Only 3.4% of the gap to LEAR was closed.",
        ],
      },
      { type: "heading", level: 3, text: "Notebook 26: Key findings" },
      {
        type: "list",
        items: [
          "V1+wind (adding FR_Wind, DE_Wind, BE_Wind_Offshore to V1 features) gives the best MAE = 16.42. This is the best single-model result so far.",
          "Nuclear features help a bit (MAE=17.03), but wind features are more valuable.",
          "Adding all V2 features or solar data hurts performance due to noise and missing values (FR_Solar has 17.1% missing).",
          "Regime-weighted training (upweighting extreme price samples 2x, 3x, 5x in the loss) did not improve overall MAE.",
        ],
      },
      { type: "heading", level: 2, text: "Notebook 27: Closing the Gap" },
      {
        type: "paragraph",
        text: "This notebook combines all findings from the previous notebooks and tests new directions to get the Transformer as close to LEAR as possible. I test 5 things: combining the best architecture with the best features, a learning rate and batch size grid, explicit price lag features (like LEAR uses), different input window sizes, and ensembling multiple runs.",
      },
      {
        type: "table",
        table: {
          caption: "Notebook 27 results. Each improvement builds on the previous best.",
          headers: ["Experiment", "MAE", "Notes"],
          rows: [
            ["P1: d192_L3 + V1+wind", "16.56 ± 0.38", "Combining best arch + best features"],
            ["P2: + LR/BS optimization", "15.82 ± 0.37", "lr=5e-4, bs=32, cosine scheduler"],
            ["P3: + Explicit price lags", "15.90 ± 0.46", "Adding d-1, d-2, d-3, d-7 price lags"],
            ["P4: Input window sweep", "—", "168h (7 days) remains best"],
            ["LEAR (reference)", 14.24, ""],
          ],
        },
      },
      {
        type: "paragraph",
        text: "The best single-model Transformer result is around MAE = 15.82, achieved by combining the d192_L3 architecture with V1+wind features and cosine LR scheduling. The explicit price lags (mimicking LEAR's lag structure) did not help as much as expected, probably because the 168h input window already contains this information implicitly. The remaining gap to LEAR is about 1.6 MAE points (11%).",
      },
      {
        type: "paragraph",
        text: "Combined with the weighted average ensemble from Notebook 17 (which also achieved MAE = 15.69), this shows that we can get the Transformer within 1.5-2 points of LEAR, but fully closing the gap is very hard. The Transformer's main advantage remains its probabilistic output, which LEAR cannot match.",
      },
      { type: "heading", level: 2, text: "Summary of Progress" },
      {
        type: "table",
        table: {
          caption: "Overall progress from notebooks 13 to 27.",
          headers: ["Milestone", "MAE", "Gap to LEAR"],
          rows: [
            ["Starting point (Nb13 baseline)", 19.39, 5.15],
            ["Optuna HPO (Nb13)", 17.58, 3.34],
            ["V1+wind features (Nb26)", 16.42, 2.18],
            ["Best single model (Nb27)", 15.82, 1.58],
            ["Weighted ensemble (Nb17)", 15.69, 1.45],
            ["LEAR", 14.24, "—"],
          ],
        },
      },
      {
        type: "paragraph",
        text: "Overall I closed about 72% of the initial gap to LEAR (from 5.15 to 1.45 MAE points). But the Transformer has important advantages that LEAR does not have: much better probabilistic forecasting (CRPS 14.20 vs 18.41), and near-perfect uncertainty calibration with conformal prediction (PICP = 0.950). The ensemble approach shows that combining both is the best strategy.",
      },
      { type: "heading", level: 2, text: "Notebooks not worth including in detail" },
      {
        type: "paragraph",
        text: "Some notebooks produced results that are not interesting enough for the thesis:",
      },
      {
        type: "list",
        items: [
          "Notebook 14 (Keras vs PyTorch comparison): Just validates that both frameworks give similar results. Useful for implementation correctness but not scientifically interesting.",
          "Notebook 21 (LEAR as decoder feature): Adding LEAR's day-ahead forecast as a decoder feature actually made MAE worse by 4.2%. The Transformer cannot effectively learn to refine LEAR's predictions this way.",
          "Notebook 22 (PatchTST): Replacing hourly tokens with 24h patches made MAE 14% worse (20.03 vs 17.40). The hourly resolution is important for electricity prices and patch-based aggregation loses too much intra-day structure.",
        ],
      },
      {
        type: "paragraph",
        text: "These notebooks are still good to mention briefly as negative results (showing what does not work), but they do not need a full analysis in the thesis.",
      },
      { type: "heading", level: 2, text: "Next steps" },
      {
        type: "list",
        items: [
          "Run notebook 27 and analyse the full results (the notebook was just created and has not been executed yet)",
          "Possibly try ensembling the improved Transformer (Nb27) with LEAR to see if the ensemble also improves",
          "Continue writing the thesis: methodology chapter and results chapter",
          "Prepare the final comparison table for the thesis with all models and approaches",
        ],
      },
    ],
  }
];
