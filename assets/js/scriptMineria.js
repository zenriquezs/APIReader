const homeSection = document.getElementById('homeSection');
const progressSection = document.getElementById('progressSection');
const loadDataBtn = document.getElementById('loadDataBtn');
const apiUrlInput = document.getElementById('apiUrl');
const maxValuesDiv = document.getElementById('maxValues');
const filtersDiv = document.getElementById('filters');
const chartsDiv = document.getElementById('charts');
const dataTableDiv = document.getElementById('dataTable');
const xSelect = document.getElementById('xSelect');
const ySelect = document.getElementById('ySelect');
const chartTypeSelect = document.getElementById('chartType');
const customChartOutput = document.getElementById('customChartOutput');

let originalData = [];
let filteredData = [];
let dropdownOptions = [];
let numericColumns = [];

window.addEventListener("DOMContentLoaded", () => {
    loadDataBtn.click();
  });

  loadDataBtn.addEventListener("click", async () => {
    const url = apiUrlInput.value.trim();
    if (!url) return;
    const data = await fetchDataAjax(url);  
    originalData = [...data];
    filteredData = [...data];
    showMaxValues(data);
    createFilters(data);
    showCharts(data);
    showTable(data);
    populateCustomChartControls();
  });

function fetchDataAjax(url) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("GET", url, true);
        xhr.onload = function () {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const data = JSON.parse(xhr.responseText);
                    if (!Array.isArray(data)) {
                        reject(new Error("La API no retornó una lista."));
                    } else {
                        resolve(data);
                    }
                } catch (e) {
                    reject(new Error("Error al parsear JSON: " + e.message));
                }
            } else {
                reject(new Error(`HTTP error! status: ${xhr.status}`));
            }
        };
        xhr.onerror = function () {
            reject(new Error("Error de red o conexión"));
        };
        xhr.send();
    });
}
// Uso:
fetchDataAjax("https://api-influx-fastapi.onrender.com/api/datos")
  .then(data => console.log("Datos:", data))
  .catch(err => alert("Error al cargar datos: " + err.message));


function showMaxValues(data) {
    if (data.length === 0) {
        maxValuesDiv.innerHTML = '<p>No hay datos para mostrar.</p>';
        return;
    }

    const sample = data[0];
    numericColumns = Object.keys(sample).filter(k => typeof sample[k] === 'number');

    if (numericColumns.length === 0) {
        maxValuesDiv.innerHTML = '<p>No hay columnas numéricas para mostrar valores máximos.</p>';
        return;
    }

    let html = '<h3>Valores Máximos Detectados</h3><div style="display:flex; gap:20px;">';
    numericColumns.forEach(col => {
        const maxVal = Math.max(...data.map(row => (row[col] != null ? row[col] : 0)));
        html += `<div style="background:#FFD700; padding:10px; border-radius:5px; flex:1;">
                    <strong>${col}</strong><br><span style="font-size:1.2em;">${maxVal.toFixed(2)}</span>
                </div>`;
    });
    html += '</div>';
    maxValuesDiv.innerHTML = html;
}

function createFilters(data) {
    filtersDiv.innerHTML = '';
    if (data.length === 0) return;

    const sample = data[0];
    dropdownOptions = Object.keys(sample).filter(k => typeof sample[k] === 'string');

    if (dropdownOptions.length === 0) {
        filtersDiv.innerHTML = '<p>No hay columnas categóricas para filtrar.</p>';
        return;
    }

    let html = '<h3>Filtros</h3>';
    dropdownOptions.forEach(col => {
        const uniqueValues = [...new Set(data.map(row => row[col]))].sort();
        html += `<label><strong>${col}</strong></label><br>
        <select multiple id="filter-${col}">`;
        uniqueValues.forEach(val => {
            html += `<option value="${val}" selected>${val}</option>`;
        });
        html += `</select><br><br>`;
    });
    filtersDiv.innerHTML = html;

    dropdownOptions.forEach(col => {
        const selectEl = document.getElementById(`filter-${col}`);
        selectEl.addEventListener('change', applyFilters);
    });
}

function applyFilters() {
    filteredData = [...originalData];
    dropdownOptions.forEach(col => {
        const selectEl = document.getElementById(`filter-${col}`);
        const selectedOptions = Array.from(selectEl.selectedOptions).map(opt => opt.value);
        filteredData = filteredData.filter(row => selectedOptions.includes(row[col]));
    });

    if (filteredData.length > 0) {
        const sample = filteredData[0];
        dropdownOptions = Object.keys(sample).filter(k => typeof sample[k] === 'string');
        numericColumns = Object.keys(sample).filter(k => typeof sample[k] === 'number');
    } else {
        dropdownOptions = [];
        numericColumns = [];
    }

    showCharts(filteredData);
    showTable(filteredData);
    populateCustomChartControls();
}

function showTable(data) {
    if (data.length === 0) {
        dataTableDiv.innerHTML = '<p>No hay datos para mostrar.</p>';
        return;
    }

    let html = '<h3>Datos</h3><table><thead><tr>';
    const columns = Object.keys(data[0]);
    columns.forEach(col => {
        html += `<th>${col}</th>`;
    });
    html += '</tr></thead><tbody>';

    data.forEach(row => {
        html += '<tr>';
        columns.forEach(col => {
            html += `<td>${row[col]}</td>`;
        });
        html += '</tr>';
    });

    html += '</tbody></table>';
    dataTableDiv.innerHTML = html;
}

function showCharts(data) {
    chartsDiv.innerHTML = '<h3>Gráficos</h3><div id="chartContainer"></div>';
    if (data.length === 0) {
        chartsDiv.innerHTML += '<p>No hay datos para mostrar gráficos.</p>';
        return;
    }

    const sample = data[0];
    const numericCols = Object.keys(sample).filter(k => typeof sample[k] === 'number');
    const categoricalCols = Object.keys(sample).filter(k => typeof sample[k] === 'string');

    if (numericCols.length === 0 || categoricalCols.length === 0) {
        chartsDiv.innerHTML += '<p>No hay suficientes columnas para graficar.</p>';
        return;
    }

    const xData = data.slice(0, 5).map(row => row[categoricalCols[0]]);
    const yData = data.slice(0, 5).map(row => row[numericCols[0]]);

    const trace = {
        x: xData,
        y: yData,
        type: 'bar'
    };

    Plotly.newPlot('chartContainer', [trace], { title: `Ejemplo: ${categoricalCols[0]} vs ${numericCols[0]}` });
}

function populateCustomChartControls() {
    xSelect.innerHTML = '';
    ySelect.innerHTML = '';

    if (numericColumns.length === 0) {
        const option = document.createElement('option');
        option.disabled = true;
        option.textContent = 'No hay variables numéricas';
        xSelect.appendChild(option.cloneNode(true));
        ySelect.appendChild(option);
    } else {
        numericColumns.forEach(opt => {
            const optionX = document.createElement('option');
            optionX.value = opt;
            optionX.textContent = opt;
            xSelect.appendChild(optionX);

            const optionY = document.createElement('option');
            optionY.value = opt;
            optionY.textContent = opt;
            ySelect.appendChild(optionY);
        });
    }
}

document.getElementById('generateChartBtn').onclick = () => {
    const xVar = xSelect.value;
    const yVar = ySelect.value;
    const chartType = chartTypeSelect.value;

    if (!xVar || !yVar) {
        alert('Selecciona ambas variables (X y Y).');
        return;
    }
    if (!filteredData.length) {
        alert('No hay datos disponibles para graficar.');
        return;
    }

    const xData = filteredData.map(row => row[xVar]);
    const yData = filteredData.map(row => row[yVar]);

    let trace = {};

    if (chartType === 'histogram') {
        trace = {
            x: yData,
            type: 'histogram',
            marker: { color: '#FFD700' }
        };
    } else {
        trace = {
            x: xData,
            y: yData,
            type: chartType,
            marker: { color: '#1162ac' }
        };
    }

    const layout = {
        title: `Gráfico ${chartType} de ${yVar} vs ${xVar}`,
        xaxis: { title: xVar },
        yaxis: { title: yVar }
    };

    Plotly.newPlot(customChartOutput, [trace], layout, { responsive: true });
};

document.getElementById("loadDataBtn").addEventListener("click", async () => {
    const url = apiUrlInput.value.trim();
    if (!url) {
        alert("Por favor, ingresa una URL de API.");
        return;
    }

    try {
        const data = await fetchDataAjax(url);
        originalData = data;
        filteredData = data;
        showMaxValues(data);
        createFilters(data);
        showCharts(data);
        showTable(data);
        populateCustomChartControls();
    } catch (err) {
        alert("Error al cargar datos: " + err.message);
    }
});
