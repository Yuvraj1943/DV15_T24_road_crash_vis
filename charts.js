/**
 * charts.js — COS30045 Data Visualisation Project
 * Road Crash Hospitalisations in Australia (2011–2021)
 * Source: BITRE Hospitalised Injury Data, September 2023
 *
 * AI ACKNOWLEDGEMENT: Claude (Anthropic) was used to assist in structuring
 * this code and suggesting D3 patterns. All data selections, design decisions,
 * and visualisation choices were made by the student.
 *
 * Charts:
 *   1. drawTrendChart()     — national annual line chart
 *   2. drawStateChart()     — state/territory multi-line with toggle
 *   3. drawAgeChart()       — age group bar chart with year slider
 *   4. drawRoadUserChart()  — horizontal bar chart
 *   5. drawSexChart()       — stacked area chart
 *   6. drawFNChart()        — dual-line First Nations comparison
 */

"use strict";

// ── Shared tooltip ──────────────────────────────────────────────
const tooltip = d3.select("body").append("div").attr("class", "tooltip");

function showTooltip(html, event) {
  tooltip.html(html).style("opacity", 1)
    .style("left", (event.pageX + 14) + "px")
    .style("top",  (event.pageY - 28) + "px");
}
function hideTooltip() { tooltip.style("opacity", 0); }

// ── Colour constants ─────────────────────────────────────────────
const ACCENT   = "#e85d4a";
const ACCENT2  = "#f4a261";
const ACCENT3  = "#52b788";
const ACCENT4  = "#4cc9f0";
const ACCENT5  = "#c77dff";
const FN_COLOR = "#e85d4a";
const NON_COLOR = "#4cc9f0";

// State colour map
const STATE_COLORS = {
  NSW: "#4cc9f0", Vic: "#e85d4a", Qld: "#f4a261",
  WA:  "#52b788", SA:  "#c77dff", Tas: "#ffd60a",
  ACT: "#8ecae6", NT:  "#fb8500"
};

// ── Embedded data (derived from BITRE Excel files via KNIME/Python) ──
// National annual hospitalisations (road traffic crashes only)
const NATIONAL_ANNUAL = [
  {year:2011, hosp:34033}, {year:2012, hosp:34024}, {year:2013, hosp:35001},
  {year:2014, hosp:35515}, {year:2015, hosp:37082}, {year:2016, hosp:38963},
  {year:2017, hosp:39339}, {year:2018, hosp:39590}, {year:2019, hosp:39866},
  {year:2020, hosp:37966}, {year:2021, hosp:39505}
];

// State/Territory annual (road traffic crashes only, counts excluding died in hospital)
const STATE_ANNUAL = {
  NSW: [10618,11121,11421,11313,11084,11474,11016, 9794, 9942, 9274, 9003],
  Vic: [ 9326, 8098, 7784, 8523, 9198,10360,10794,11453,11392, 9884,11130],
  Qld: [ 6322, 6813, 7821, 7725, 8306, 8702, 9134, 9381, 9515, 9801,10447],
  WA:  [ 3442, 3493, 3475, 3154, 3183, 3031, 3195, 3274, 3534, 3636, 3568],
  SA:  [ 2359, 2311, 2221, 2381, 2467, 2654, 2394, 2489, 2457, 2503, 2632],
  Tas: [  493,  536,  570,  646,  677,  657,  659,  781,  708,  778,  805],
  ACT: [  537,  601,  573,  542,  700,  654,  632,  712,  665,  629,  740],
  NT:  [  456,  496,  561,  575,  691,  709,  703,  832,  656,  787,  710]
};

// Age group data by year
const AGE_DATA = {
  "0-7":  [719,750,732,729,750,736,740,724,704,714,707],
  "8-16": [2520,2327,2383,2231,2439,2476,2498,2422,2495,2799,2863],
  "17-25":[8094,8035,7852,7728,7882,8474,8468,8309,8102,7971,8010],
  "26-39":[8166,8251,8472,8668,8977,9451,9508,9736,9641,9202,9423],
  "40-64":[10660,10662,11345,11666,12199,12749,12937,12973,13170,12342,13026],
  "65-74":[1968,1941,2157,2345,2465,2677,2777,2876,3068,2779,3018],
  "75+":  [1906,2058,2060,2147,2370,2400,2411,2550,2686,2159,2458]
};

// Sex data by year
const SEX_DATA = {
  Male:   [22321,22431,22957,23221,23920,25011,25256,25315,25365,25178,25788],
  Female: [11712,11593,12042,12294,13161,13952,14083,14273,14499,12781,13716]
};

// Road user totals (2011-2021)
const ROAD_USER_DATA = [
  {user:"Car driver",           hosp:135063},
  {user:"Motorcyclist",         hosp:92322},
  {user:"Pedal cyclist",        hosp:75362},
  {user:"Car passenger",        hosp:53241},
  {user:"Pedestrian",           hosp:28532},
  {user:"Other/unknown",        hosp:6346},
  {user:"Heavy transport",      hosp:5611},
  {user:"Ute/van occupant",     hosp:2987},
  {user:"Bus occupant",         hosp:2584}
];

// First Nations vs Non-Indigenous
const FN_DATA = [
  {year:2011, fn:1167, non:31997}, {year:2012, fn:1404, non:31790},
  {year:2013, fn:1414, non:32839}, {year:2014, fn:1407, non:30785},
  {year:2015, fn:1600, non:34773}, {year:2016, fn:1669, non:36684},
  {year:2017, fn:1733, non:37030}, {year:2018, fn:1930, non:37198},
  {year:2019, fn:1856, non:37482}, {year:2020, fn:2290, non:35186},
  {year:2021, fn:2220, non:36755}
];

const YEARS = [2011,2012,2013,2014,2015,2016,2017,2018,2019,2020,2021];

// ── Utility: get container dimensions ──────────────────────────
function getDims(selector, marginObj) {
  const el = document.querySelector(selector);
  const w = el.clientWidth - marginObj.left - marginObj.right;
  const h = el.clientHeight - marginObj.top - marginObj.bottom;
  return { w, h };
}

// ────────────────────────────────────────────────────────────────
// 1. NATIONAL TREND CHART — line chart with break indicators
// ────────────────────────────────────────────────────────────────
function drawTrendChart() {
  const container = "#chart-trend";
  const m = { top: 30, right: 40, bottom: 45, left: 65 };
  const el = document.querySelector(container);
  const W = el.clientWidth - m.left - m.right;
  const H = el.clientHeight - m.top - m.bottom;

  const svg = d3.select(container).append("svg")
    .attr("width", W + m.left + m.right)
    .attr("height", H + m.top + m.bottom)
    .append("g").attr("transform", `translate(${m.left},${m.top})`);

  const x = d3.scaleLinear().domain([2011, 2021]).range([0, W]);
  const y = d3.scaleLinear()
    .domain([30000, d3.max(NATIONAL_ANNUAL, d => d.hosp) * 1.05])
    .range([H, 0]);

  // Grid
  svg.append("g").attr("class","grid")
    .call(d3.axisLeft(y).tickSize(-W).tickFormat("").ticks(5));

  // Break region 2012 (VIC policy change)
  svg.append("rect")
    .attr("x", x(2011.5)).attr("y", 0)
    .attr("width", x(2012.5) - x(2011.5)).attr("height", H)
    .attr("fill", ACCENT2).attr("opacity", 0.07);

  // Break region 2017 (NSW policy change)
  svg.append("rect")
    .attr("x", x(2016.5)).attr("y", 0)
    .attr("width", x(2017.5) - x(2016.5)).attr("height", H)
    .attr("fill", ACCENT2).attr("opacity", 0.07);

  // Axes
  svg.append("g").attr("class","axis")
    .attr("transform", `translate(0,${H})`)
    .call(d3.axisBottom(x).tickFormat(d3.format("d")).ticks(11));

  svg.append("g").attr("class","axis")
    .call(d3.axisLeft(y).ticks(5).tickFormat(d => d3.format(",")(d)));

  // Y-axis label
  svg.append("text")
    .attr("transform","rotate(-90)")
    .attr("y", -55).attr("x", -H/2)
    .attr("text-anchor","middle")
    .attr("fill","#8b949e")
    .attr("font-size","11px")
    .text("Hospitalisations");

  // Line
  const line = d3.line()
    .x(d => x(d.year))
    .y(d => y(d.hosp))
    .curve(d3.curveMonotoneX);

  // Area fill
  const area = d3.area()
    .x(d => x(d.year))
    .y0(H)
    .y1(d => y(d.hosp))
    .curve(d3.curveMonotoneX);

  svg.append("defs").append("linearGradient")
    .attr("id","trend-grad")
    .attr("x1","0").attr("y1","0").attr("x2","0").attr("y2","1")
    .selectAll("stop")
    .data([
      {offset:"0%", color: ACCENT, opacity: 0.25},
      {offset:"100%", color: ACCENT, opacity: 0.02}
    ])
    .enter().append("stop")
    .attr("offset", d=>d.offset)
    .attr("stop-color", d=>d.color)
    .attr("stop-opacity", d=>d.opacity);

  svg.append("path")
    .datum(NATIONAL_ANNUAL)
    .attr("fill","url(#trend-grad)")
    .attr("d", area);

  svg.append("path")
    .datum(NATIONAL_ANNUAL)
    .attr("fill","none")
    .attr("stroke", ACCENT)
    .attr("stroke-width", 2.5)
    .attr("d", line);

  // Dots
  svg.selectAll(".dot")
    .data(NATIONAL_ANNUAL).enter()
    .append("circle")
    .attr("class","dot")
    .attr("cx", d => x(d.year))
    .attr("cy", d => y(d.hosp))
    .attr("r", 5)
    .attr("fill", ACCENT)
    .attr("stroke","#0d1117")
    .attr("stroke-width", 2)
    .style("cursor","pointer")
    .on("mouseover", (event, d) => {
      showTooltip(`<strong>${d.year}</strong><br>${d3.format(",")(d.hosp)} hospitalisations`, event);
    })
    .on("mouseout", hideTooltip);

  // COVID annotation
  svg.append("text")
    .attr("x", x(2020) - 5).attr("y", y(37966) - 15)
    .attr("text-anchor","middle")
    .attr("fill", ACCENT4)
    .attr("font-size","10px")
    .text("COVID-19 ↓");
}

// ────────────────────────────────────────────────────────────────
// 2. STATE CHART — multi-line with toggle buttons
// ────────────────────────────────────────────────────────────────
let activeStates = ["NSW","Vic","Qld","NT"];

function drawStateChart() {
  const container = "#chart-states";
  const m = { top: 20, right: 120, bottom: 45, left: 65 };
  const el = document.querySelector(container);
  const W = el.clientWidth - m.left - m.right;
  const H = el.clientHeight - m.top - m.bottom;

  // Build toggle buttons
  const toggleContainer = document.getElementById("state-toggles");
  Object.keys(STATE_COLORS).forEach(st => {
    const btn = document.createElement("button");
    btn.className = "state-btn" + (activeStates.includes(st) ? " active" : "");
    btn.textContent = st;
    btn.style.setProperty("--state-col", STATE_COLORS[st]);
    if (activeStates.includes(st)) btn.style.borderColor = STATE_COLORS[st];
    btn.addEventListener("click", () => {
      if (activeStates.includes(st)) {
        if (activeStates.length === 1) return; // keep at least one
        activeStates = activeStates.filter(s => s !== st);
        btn.classList.remove("active");
        btn.style.borderColor = "";
      } else {
        activeStates.push(st);
        btn.classList.add("active");
        btn.style.borderColor = STATE_COLORS[st];
      }
      updateStateChart(svg, x, W, H);
    });
    toggleContainer.appendChild(btn);
  });

  const svg = d3.select(container).append("svg")
    .attr("width", W + m.left + m.right)
    .attr("height", H + m.top + m.bottom)
    .append("g").attr("transform", `translate(${m.left},${m.top})`);

  const x = d3.scaleLinear().domain([2011,2021]).range([0,W]);
  const y = d3.scaleLinear().domain([0, 12000]).range([H,0]);

  svg.append("g").attr("class","grid")
    .call(d3.axisLeft(y).tickSize(-W).tickFormat("").ticks(5));

  svg.append("g").attr("class","axis")
    .attr("transform",`translate(0,${H})`)
    .call(d3.axisBottom(x).tickFormat(d3.format("d")).ticks(11));

  svg.append("g").attr("class","axis")
    .call(d3.axisLeft(y).ticks(5).tickFormat(d => d3.format(",")(d)));

  svg.append("text")
    .attr("transform","rotate(-90)")
    .attr("y",-55).attr("x",-H/2)
    .attr("text-anchor","middle")
    .attr("fill","#8b949e").attr("font-size","11px")
    .text("Hospitalisations");

  updateStateChart(svg, x, W, H);
}

function updateStateChart(svg, x, W, H) {
  const y = d3.scaleLinear().domain([0, 12000]).range([H,0]);
  const line = d3.line()
    .x((d,i) => x(YEARS[i]))
    .y(d => y(d))
    .curve(d3.curveMonotoneX);

  // Remove old lines & labels & dots
  svg.selectAll(".state-line, .state-label, .state-dot").remove();

  activeStates.forEach(st => {
    const data = STATE_ANNUAL[st];
    svg.append("path")
      .datum(data)
      .attr("class","state-line")
      .attr("fill","none")
      .attr("stroke", STATE_COLORS[st])
      .attr("stroke-width", 2)
      .attr("d", line);

    // End label
    const lastVal = data[data.length - 1];
    svg.append("text")
      .attr("class","state-label")
      .attr("x", x(2021) + 8)
      .attr("y", y(lastVal))
      .attr("fill", STATE_COLORS[st])
      .attr("font-size","11px")
      .attr("dominant-baseline","middle")
      .text(st);

    // Interactive dots
    svg.selectAll(`.dot-${st}`)
      .data(data).enter()
      .append("circle")
      .attr("class",`state-dot dot-${st}`)
      .attr("cx", (d,i) => x(YEARS[i]))
      .attr("cy", d => y(d))
      .attr("r", 4)
      .attr("fill", STATE_COLORS[st])
      .attr("stroke","#0d1117").attr("stroke-width",1.5)
      .style("cursor","pointer")
      .on("mouseover", (event, d, i) => {
        const idx = data.indexOf(d);
        showTooltip(`<strong>${st} · ${YEARS[idx]}</strong><br>${d3.format(",")(d)} hospitalisations`, event);
      })
      .on("mouseout", hideTooltip);
  });
}

// ────────────────────────────────────────────────────────────────
// 3. AGE CHART — bar chart with year slider
// ────────────────────────────────────────────────────────────────
const AGE_COLORS = ["#4cc9f0","#52b788","#f4a261","#e85d4a","#c77dff","#ffd60a","#fb8500"];
const AGE_GROUPS = ["0-7","8-16","17-25","26-39","40-64","65-74","75+"];

function getAgeDataForYear(year) {
  const idx = YEARS.indexOf(year);
  return AGE_GROUPS.map((ag, i) => ({ age: ag, hosp: AGE_DATA[ag][idx], color: AGE_COLORS[i] }));
}

let ageSvg, ageX, ageY, ageH;

function drawAgeChart() {
  const container = "#chart-age";
  const m = { top: 15, right: 20, bottom: 50, left: 65 };
  const el = document.querySelector(container);
  const W = el.clientWidth - m.left - m.right;
  ageH = el.clientHeight - m.top - m.bottom;

  ageSvg = d3.select(container).append("svg")
    .attr("width", W + m.left + m.right)
    .attr("height", ageH + m.top + m.bottom)
    .append("g").attr("transform", `translate(${m.left},${m.top})`);

  ageX = d3.scaleBand().domain(AGE_GROUPS).range([0, W]).padding(0.25);
  ageY = d3.scaleLinear().domain([0, 14000]).range([ageH, 0]);

  ageSvg.append("g").attr("class","grid")
    .call(d3.axisLeft(ageY).tickSize(-W).tickFormat("").ticks(5));

  ageSvg.append("g").attr("class","axis")
    .attr("transform",`translate(0,${ageH})`)
    .call(d3.axisBottom(ageX));

  ageSvg.append("g").attr("class","axis")
    .call(d3.axisLeft(ageY).ticks(5).tickFormat(d => d3.format(",")( d)));

  ageSvg.append("text")
    .attr("transform","rotate(-90)")
    .attr("y",-55).attr("x",-ageH/2)
    .attr("text-anchor","middle")
    .attr("fill","#8b949e").attr("font-size","10px")
    .text("Hospitalisations");

  updateAgeChart(2021);

  // Slider interaction
  const slider = document.getElementById("year-slider");
  const label  = document.getElementById("year-label");
  slider.addEventListener("input", () => {
    const yr = +slider.value;
    label.textContent = yr;
    updateAgeChart(yr);
  });
}

function updateAgeChart(year) {
  const data = getAgeDataForYear(year);
  const bars = ageSvg.selectAll(".age-bar").data(data, d => d.age);

  bars.enter().append("rect")
    .attr("class","age-bar")
    .attr("x", d => ageX(d.age))
    .attr("width", ageX.bandwidth())
    .attr("y", ageH).attr("height", 0)
    .attr("rx", 3)
    .merge(bars)
    .attr("fill", d => d.color)
    .style("cursor","pointer")
    .on("mouseover", (event, d) => {
      showTooltip(`<strong>${d.age} years</strong><br>${d3.format(",")(d.hosp)} hospitalisations`, event);
    })
    .on("mouseout", hideTooltip)
    .transition().duration(400)
    .attr("y", d => ageY(d.hosp))
    .attr("height", d => ageH - ageY(d.hosp));

  bars.exit().remove();
}

// ────────────────────────────────────────────────────────────────
// 4. ROAD USER CHART — horizontal bar chart
// ────────────────────────────────────────────────────────────────
function drawRoadUserChart() {
  const container = "#chart-roaduser";
  const m = { top: 15, right: 80, bottom: 20, left: 130 };
  const el = document.querySelector(container);
  const W = el.clientWidth - m.left - m.right;
  const H = el.clientHeight - m.top - m.bottom;

  const svg = d3.select(container).append("svg")
    .attr("width", W + m.left + m.right)
    .attr("height", H + m.top + m.bottom)
    .append("g").attr("transform", `translate(${m.left},${m.top})`);

  const sorted = [...ROAD_USER_DATA].sort((a,b) => b.hosp - a.hosp);

  const y = d3.scaleBand().domain(sorted.map(d=>d.user)).range([0,H]).padding(0.3);
  const x = d3.scaleLinear().domain([0, d3.max(sorted,d=>d.hosp)*1.05]).range([0,W]);

  svg.append("g").attr("class","axis").call(d3.axisLeft(y).tickSize(0));
  svg.append("g").attr("class","axis").attr("transform",`translate(0,${H})`)
    .call(d3.axisBottom(x).ticks(4).tickFormat(d => d3.format(",")( d)));

  // colour ramp
  const colorScale = d3.scaleSequential()
    .domain([0, sorted.length])
    .interpolator(d3.interpolateRgb("#4cc9f0","#e85d4a"));

  svg.selectAll(".ru-bar")
    .data(sorted).enter()
    .append("rect")
    .attr("class","ru-bar")
    .attr("y", d => y(d.user))
    .attr("height", y.bandwidth())
    .attr("x", 0).attr("width", 0)
    .attr("rx", 3)
    .attr("fill", (d,i) => colorScale(i))
    .style("cursor","pointer")
    .on("mouseover", (event, d) => {
      showTooltip(`<strong>${d.user}</strong><br>${d3.format(",")(d.hosp)} total (2011–2021)`, event);
    })
    .on("mouseout", hideTooltip)
    .transition().duration(600).delay((d,i)=>i*50)
    .attr("width", d => x(d.hosp));

  // Value labels
  svg.selectAll(".ru-label")
    .data(sorted).enter()
    .append("text")
    .attr("class","ru-label")
    .attr("y", d => y(d.user) + y.bandwidth()/2)
    .attr("x", d => x(d.hosp) + 6)
    .attr("dominant-baseline","middle")
    .attr("fill","#8b949e")
    .attr("font-size","10px")
    .text(d => d3.format(",")(d.hosp));
}

// ────────────────────────────────────────────────────────────────
// 5. SEX CHART — area chart (male/female over time)
// ────────────────────────────────────────────────────────────────
function drawSexChart() {
  const container = "#chart-sex";
  const m = { top: 20, right: 120, bottom: 45, left: 65 };
  const el = document.querySelector(container);
  const W = el.clientWidth - m.left - m.right;
  const H = el.clientHeight - m.top - m.bottom;

  const svg = d3.select(container).append("svg")
    .attr("width", W + m.left + m.right)
    .attr("height", H + m.top + m.bottom)
    .append("g").attr("transform", `translate(${m.left},${m.top})`);

  const data = YEARS.map((yr,i) => ({
    year: yr, Male: SEX_DATA.Male[i], Female: SEX_DATA.Female[i]
  }));

  const x = d3.scaleLinear().domain([2011,2021]).range([0,W]);
  const y = d3.scaleLinear().domain([0, 28000]).range([H,0]);

  svg.append("g").attr("class","grid")
    .call(d3.axisLeft(y).tickSize(-W).tickFormat("").ticks(5));

  svg.append("g").attr("class","axis")
    .attr("transform",`translate(0,${H})`)
    .call(d3.axisBottom(x).tickFormat(d3.format("d")).ticks(11));

  svg.append("g").attr("class","axis")
    .call(d3.axisLeft(y).ticks(5).tickFormat(d => d3.format(",")(d)));

  svg.append("text")
    .attr("transform","rotate(-90)")
    .attr("y",-55).attr("x",-H/2)
    .attr("text-anchor","middle")
    .attr("fill","#8b949e").attr("font-size","11px")
    .text("Hospitalisations");

  const lineGen = key => d3.line()
    .x(d => x(d.year))
    .y(d => y(d[key]))
    .curve(d3.curveMonotoneX);

  const areaGen = (key, base) => d3.area()
    .x(d => x(d.year))
    .y0(base)
    .y1(d => y(d[key]))
    .curve(d3.curveMonotoneX);

  // Add gradient defs
  const defs = svg.append("defs");
  [{id:"male-grad",   color:ACCENT4},
   {id:"female-grad", color:ACCENT}].forEach(({id, color}) => {
    defs.append("linearGradient").attr("id",id)
      .attr("x1","0").attr("y1","0").attr("x2","0").attr("y2","1")
      .selectAll("stop")
      .data([{o:"0%",op:0.25},{o:"100%",op:0.02}]).enter()
      .append("stop")
      .attr("offset",d=>d.o)
      .attr("stop-color",color)
      .attr("stop-opacity",d=>d.op);
  });

  // Areas
  svg.append("path").datum(data).attr("fill","url(#male-grad)").attr("d", areaGen("Male", H));
  svg.append("path").datum(data).attr("fill","url(#female-grad)").attr("d", areaGen("Female", H));

  // Lines
  [{key:"Male", color:ACCENT4, label:"Male"},
   {key:"Female", color:ACCENT, label:"Female"}].forEach(({key,color,label}) => {
    svg.append("path").datum(data)
      .attr("fill","none").attr("stroke",color)
      .attr("stroke-width",2.5)
      .attr("d", lineGen(key));

    // End label
    const last = data[data.length-1];
    svg.append("text")
      .attr("x", x(2021)+8).attr("y", y(last[key]))
      .attr("fill",color).attr("font-size","11px")
      .attr("dominant-baseline","middle").text(label);
  });

  // Interactive overlay
  const bisect = d3.bisector(d => d.year).left;
  svg.append("rect")
    .attr("width",W).attr("height",H)
    .attr("fill","transparent")
    .on("mousemove", function(event) {
      const [mx] = d3.pointer(event);
      const yr = x.invert(mx);
      const idx = Math.round(yr) - 2011;
      if (idx < 0 || idx > 10) return;
      const d = data[idx];
      showTooltip(
        `<strong>${d.year}</strong><br>
         <span style="color:${ACCENT4}">Male:</span> ${d3.format(",")(d.Male)}<br>
         <span style="color:${ACCENT}">Female:</span> ${d3.format(",")(d.Female)}`,
        event
      );
    })
    .on("mouseout", hideTooltip);
}

// ────────────────────────────────────────────────────────────────
// 6. FIRST NATIONS CHART — dual-line comparison
// ────────────────────────────────────────────────────────────────
function drawFNChart() {
  const container = "#chart-fn";
  const m = { top: 30, right: 160, bottom: 45, left: 75 };
  const el = document.querySelector(container);
  const W = el.clientWidth - m.left - m.right;
  const H = el.clientHeight - m.top - m.bottom;

  const svg = d3.select(container).append("svg")
    .attr("width", W + m.left + m.right)
    .attr("height", H + m.top + m.bottom)
    .append("g").attr("transform", `translate(${m.left},${m.top})`);

  const x = d3.scaleLinear().domain([2011,2021]).range([0,W]);

  // Two y-axes: left for First Nations (smaller scale), right for non-Indigenous
  const yFN  = d3.scaleLinear().domain([0, 2800]).range([H,0]);
  const yNon = d3.scaleLinear().domain([0, 42000]).range([H,0]);

  svg.append("g").attr("class","grid")
    .call(d3.axisLeft(yFN).tickSize(-W).tickFormat("").ticks(5));

  svg.append("g").attr("class","axis")
    .attr("transform",`translate(0,${H})`)
    .call(d3.axisBottom(x).tickFormat(d3.format("d")).ticks(11));

  svg.append("g").attr("class","axis")
    .call(d3.axisLeft(yFN).ticks(5).tickFormat(d => d3.format(",")(d)));

  svg.append("g").attr("class","axis")
    .attr("transform",`translate(${W},0)`)
    .call(d3.axisRight(yNon).ticks(5).tickFormat(d => d3.format(",")(d)));

  // Y axis labels
  svg.append("text").attr("transform","rotate(-90)")
    .attr("y",-65).attr("x",-H/2).attr("text-anchor","middle")
    .attr("fill", FN_COLOR).attr("font-size","11px")
    .text("First Nations hospitalisations");

  svg.append("text").attr("transform","rotate(90)")
    .attr("y",-(W+125)).attr("x",H/2).attr("text-anchor","middle")
    .attr("fill", NON_COLOR).attr("font-size","11px")
    .text("Non-Indigenous hospitalisations");

  const lineFN = d3.line()
    .x(d => x(d.year)).y(d => yFN(d.fn)).curve(d3.curveMonotoneX);
  const lineNon = d3.line()
    .x(d => x(d.year)).y(d => yNon(d.non)).curve(d3.curveMonotoneX);

  // Non-Indigenous area
  const areaNon = d3.area()
    .x(d => x(d.year)).y0(H).y1(d => yNon(d.non)).curve(d3.curveMonotoneX);

  svg.append("defs").append("linearGradient").attr("id","non-grad2")
    .attr("x1","0").attr("y1","0").attr("x2","0").attr("y2","1")
    .selectAll("stop").data([{o:"0%",op:0.12},{o:"100%",op:0.01}]).enter()
    .append("stop").attr("offset",d=>d.o)
    .attr("stop-color",NON_COLOR).attr("stop-opacity",d=>d.op);

  svg.append("path").datum(FN_DATA).attr("fill","url(#non-grad2)").attr("d",areaNon);
  svg.append("path").datum(FN_DATA).attr("fill","none")
    .attr("stroke", NON_COLOR).attr("stroke-width",2.5).attr("d",lineNon);
  svg.append("path").datum(FN_DATA).attr("fill","none")
    .attr("stroke", FN_COLOR).attr("stroke-width",3)
    .attr("stroke-dasharray","0").attr("d",lineFN);

  // Dots + tooltip
  [{key:"fn",y:yFN,color:FN_COLOR,label:"First Nations"},
   {key:"non",y:yNon,color:NON_COLOR,label:"Non-Indigenous"}].forEach(({key,y,color,label}) => {
    svg.selectAll(`.dot-${key}`)
      .data(FN_DATA).enter().append("circle")
      .attr("class",`dot-${key}`)
      .attr("cx",d=>x(d.year)).attr("cy",d=>y(d[key])).attr("r",5)
      .attr("fill",color).attr("stroke","#0d1117").attr("stroke-width",2)
      .style("cursor","pointer")
      .on("mouseover",(event,d)=>{
        showTooltip(
          `<strong>${label} · ${d.year}</strong><br>${d3.format(",")(d[key])} hospitalisations`,
          event
        );
      })
      .on("mouseout",hideTooltip);

    // End label
    const last = FN_DATA[FN_DATA.length-1];
    svg.append("text")
      .attr("x", x(2021)+8).attr("y", y(last[key]))
      .attr("fill",color).attr("font-size","11px")
      .attr("dominant-baseline","middle").text(label);
  });

  // Callout: 2020 spike
  svg.append("line")
    .attr("x1", x(2020)).attr("x2", x(2020))
    .attr("y1", yFN(2290) - 12).attr("y2", yFN(2290) - 35)
    .attr("stroke", FN_COLOR).attr("stroke-width",1).attr("stroke-dasharray","3,3");
  svg.append("text")
    .attr("x", x(2020)).attr("y", yFN(2290) - 40)
    .attr("text-anchor","middle")
    .attr("fill", FN_COLOR).attr("font-size","10px")
    .text("Peak: 2,290");
}

// ────────────────────────────────────────────────────────────────
// INIT — draw all charts on DOMContentLoaded
// ────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  drawTrendChart();
  drawStateChart();
  drawAgeChart();
  drawRoadUserChart();
  drawSexChart();
  drawFNChart();
});
