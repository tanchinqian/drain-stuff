# Overview weather forecast

Overview opens in Weather forecast mode. The panel beneath the map shows seven days for the mapped Bandar Bukit Raja centre (3.08495 N, 101.43130 E), with temperature, rain chance, humidity, wind and selectable three-hour periods. All dates and times use Asia/Kuala_Lumpur. Storm simulator is a separate mode retaining its own manual inputs, saved results, playback and upkeep priorities.

`GET /api/v1/weather/forecast` requests Open-Meteo hourly and daily forecasts. Successful responses are cached for 15 minutes; failed responses for 30 seconds. Values are validated, missing values remain null, and offline mode displays unavailable rather than synthetic weather. The UI provides attribution and the retrieval time. Provider documentation: https://open-meteo.com/en/docs.

Open-Meteo hourly precipitation is the amount in the preceding hour. The adapter shifts that timestamp back one hour before grouping it into periods. Eight forecast days are fetched so the final displayed day's 9pm–midnight period includes rainfall ending at midnight on the following day.

Selecting a period updates the map with the forecast's average hourly rainfall and starts a cancellable browser worker. It passes all three hourly rainfall amounts to the shared drainage engine as a drawn rainfall curve, preserving the total rather than using the simulator's alternating-block design storm. Confirmed faults and available trial conductivity measurements are applied. No storm run or operational record is created.

Asset labels and the impact summary show peak water and overflow within the selected three hours. Blue rings identify assets with modelled water; they do not represent flood extent. Each period starts from the engine's default soil and empty surface/network conditions, independently of earlier periods. This is a forecast-driven estimate under uncalibrated asset assumptions, not a neighbourhood flood forecast or a house-level prediction. Weather conditions and rain probability remain distinct from rainfall amount.
