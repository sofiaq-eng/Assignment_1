// This is the position of the heatmap
const width = 900;
const height = 480;
const margin = { top: 60, right: 30, bottom: 40, left: 70 };

// This is the space for the heatmap
const svg = d3.select("#chart")
  .append("svg") // SVG
  .attr("width", width)
  .attr("height", height);

// position and space for heatmap #2

// Create a separate SVG for the daily trends heatmap
const level2Width = 900;
const level2Height = 680;

const svg2 = d3.select("#chart-level-2")
  .append("svg")
  .attr("width", level2Width)
  .attr("height", level2Height);

// import the data
d3.csv("temperature_daily.csv", d => ({
  date: new Date(d.date + "T00:00:00"),
  max: +d.max_temperature,
  min: +d.min_temperature
})).then(data => {
  console.log("Data loaded:", data); //to check the data
  console.log("CSV columns:", Object.keys(data[0]));

  // consider only correct data
  const validData = data.filter(d =>
    !isNaN(d.date) &&
    Number.isFinite(d.max) &&
    Number.isFinite(d.min)
  );

  // organize all the data for the heatmap
  const monthly = d3.rollups( //consider only correct data
    validData,
    values => ({
      max: d3.max(values, d => d.max), // the max temp
      min: d3.min(values, d => d.min) // the min temp
    }),
    d => d.date.getFullYear(), //group per year
    d => d.date.getMonth() //group per month
  );

  // organize all the data for the heatmap
  const cells = [];
  monthly.forEach(([year, months]) => {
    months.forEach(([month, values]) => {
      cells.push({ year, month, ...values });
    });
  });

  const dataYears = cells.map(d => d.year); // all the years in data
  const years = d3.range(d3.min(dataYears), d3.max(dataYears) + 1); // to include the last year
  const months = d3.range(12); // months numbers

  const monthNames = [  // months names
    "January", "February", "March", "April",
    "May", "June", "July", "August",
    "September", "October", "November", "December"
  ];


  //////////////////////////////////////////////////////
  // LEVEL 1
  //////////////////////////////////////////////////////

  // x for the years
  const x = d3.scaleBand()
    .domain(years)
    .range([margin.left, width - margin.right])
    .padding(0.15); //space between squares

  // y for the months
  const y = d3.scaleBand()
    .domain(months)
    .range([margin.top, height - margin.bottom])
    .padding(0.15); //space between squares


  // colors for the warmer temps and the colder temps
  const colorMax = d3.scaleSequential()
    .domain([
      d3.min(cells, d => d.max),
      d3.max(cells, d => d.max)
    ])
    .interpolator(d3.interpolateYlOrRd); //red palette

  const colorMin = d3.scaleSequential()
    .domain([
      d3.min(cells, d => d.min),
      d3.max(cells, d => d.min)
    ])
    .interpolator(d3.interpolateBlues); //blue palette


  // merge the style with the HTML
  const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("display", "none");


  let showMax = true; // to show the max temp as default and then when click shitch to min

  function draw() { //This actually draw the heatmap
    svg.selectAll("*").remove(); // use the space in the SVG that we did in line 9

    //titles of heatmap
    svg.append("text")
      .attr("x", margin.left)
      .attr("y", 25)
      .attr("text-anchor", "start")
      .attr("font-size", 18)
      .text(showMax ? "HK Maximum Temperature Heatmap" : //for default
                     "HK Minimum Temperature Heatmap"); // for click in switch

    svg.append("g")
      .attr("transform", `translate(0,${margin.top})`) //x axis on the top (years)
      .call(d3.axisTop(x).tickValues(years));

    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`) // y axis on the left (months)
      .call(d3.axisLeft(y).tickFormat(d => monthNames[d]));

    // cells of the heatmap (boxes)
    svg.selectAll("rect.cell")
      .data(cells) // select the data
      .join("rect") // create squares
      .attr("class", "cell")
      .attr("x", d => x(d.year)) // add the x
      .attr("y", d => y(d.month)) // add the y
      // size of cells
      .attr("width", x.bandwidth())
      .attr("height", y.bandwidth())
      // color of the cells
      .attr("fill", d => showMax ? colorMax(d.max) : colorMin(d.min))
      // when move the mouse have the legend
      .on("mousemove", function(event, d) {
        tooltip
          .style("display", "block")
          .style("left", (event.pageX) + "px") // the position of the box
          .style("top", (event.pageY) + "px")
          // the text in the box
          .text(`Date: ${d.year}-${String(d.month + 1).padStart(2, "0")} max: ${d.max} min: ${d.min}`);
      })
      .on("mouseleave", () => tooltip.style("display", "none"));

    // show the right colors
    const activeColor = showMax ? colorMax : colorMin;

    // for the min temps
    const legendMin = showMax
      ? d3.min(cells, d => d.max)
      : d3.min(cells, d => d.min);

    // for the max temps
    const legendMax = showMax
      ? d3.max(cells, d => d.max)
      : d3.max(cells, d => d.min);

    // get the range of colors for the legend
    const legend = svg.append("g")
      .attr("transform", `translate(${margin.left}, ${height - 20})`);

    // display all the colors from the min temp to max
    legend.selectAll("rect")
      .data(d3.range(100))
      .join("rect")
      .attr("x", d => d * 3)
      .attr("y", 0)
      .attr("width", 3)
      .attr("height", 8)
      .attr("fill", d => activeColor(
        legendMin + (d / 99) * (legendMax - legendMin)
      ));

    // Add the Min label
    legend.append("text")
      .attr("x", 0)
      .attr("y", -5)
      .attr("font-size", 12)
      .text("Min");

    // Add the Max label
    legend.append("text")
      .attr("x", 300)
      .attr("y", -5)
      .attr("font-size", 12)
      .attr("text-anchor", "end")
      .text("Max");

  } // End of the draw() function


  // create the switch button
  d3.select("#chart")
    .insert("button", "svg")
    .text("Switch Max / Min")
    .on("click", () => {
      showMax = !showMax;
      draw();
    });

  draw(); // finally draw the heatmap


  //////////////////////////////////////////////////////
  // LEVEL 2
  //////////////////////////////////////////////////////

  // keep only the last 10 years of daily data for Level 2
  const lastYear = d3.max(validData, d => d.date.getFullYear());
  const firstYear = lastYear - 9;

  const recentData = validData.filter(d =>
    d.date.getFullYear() >= firstYear &&
    d.date.getFullYear() <= lastYear
  );

  console.log("Level 2 years:", firstYear, "-", lastYear);
  console.log("Level 2 daily records:", recentData.length);

  // same for heatmap 2 (only 10 years)
  const years2 = d3.range(firstYear, lastYear + 1);
  const months2 = d3.range(12);

  //positioning each cell for level 2
  const x2 = d3.scaleBand()
    .domain(years2)
    .range([margin.left, level2Width - margin.right])
    .padding(0.15); //space between squares

  const y2 = d3.scaleBand()
    .domain(months2)
    .range([margin.top, level2Height - margin.bottom])
    .padding(0.15); //space between squares

  //prepare monthly cells using the last 10 years
  const cells2 = [];

  years2.forEach(year => {
    months2.forEach(month => {
      const dailyData = recentData.filter(d =>
        d.date.getFullYear() === year &&
        d.date.getMonth() === month
      );

      if (dailyData.length > 0) {
        cells2.push({
          year: year,
          month: month,
          dailyData: dailyData
        });
      }
    });
  });
  
  // Color the monthly cells using maximum temperatures
  const colorMax2 = d3.scaleSequential()
    .domain([
      d3.min(cells2, d => d3.max(d.dailyData, v => v.max)),
      d3.max(cells2, d => d3.max(d.dailyData, v => v.max))
    ])
    .interpolator(d3.interpolateYlOrRd); //red palette


  const colorMax3 = d3.scaleQuantize()
    .domain([0, 40])
    .range([
      "#9870D6", // 0°C  - vivid purple
      "#536FE0", // 4°C  - blue
      "#398FE0", // 8°C  - bright blue
      "#38BDE5", // 12°C - cyan
      "#24C6AD", // 16°C - turquoise
      "#42BB58", // 20°C - green
      "#91C52C", // 24°C - lime green
      "#E0C52E", // 28°C - yellow
      "#FE9929", // 32°C - orange
      "#F03B20", // 36°C - strong orange-red
      "#BD0026"  // 40°C - deep red
    ]);


  // Add the year axis at the top
  svg2.append("g")
    .attr("transform", "translate(0, 40)")
    .call(d3.axisTop(x2).tickValues(years2));

  // put the months as y axis on the left
  svg2.append("g")
    .attr("transform", "translate(70, 0)")
    .call(d3.axisLeft(y2).tickFormat(d => monthNames[d]));


  // Shared temperature range for all mini charts the recentData(10 years)
  const minDailyTemp = d3.min(recentData, d => d.min);
  const maxDailyTemp = d3.max(recentData, d => d.max);


  // Draw the rectangles for each cell
  svg2.selectAll("rect.cell2")
    .data(cells2)
    .join("rect")
    .attr("class", "cell2")
    .attr("x", d => x2(d.year))
    .attr("y", d => y2(d.month))
    .attr("width", x2.bandwidth())
    .attr("height", y2.bandwidth())
    .attr("fill", d =>
      colorMax2(d3.max(d.dailyData, v => v.max))
    )
    .attr("stroke", "white")
    .attr("stroke-width", 1)
    // when move the mouse to have the legend
    .on("mousemove", function(event, d) {
      tooltip
        .style("display", "block")
        .style("left", (event.pageX) + "px") // the position of the box
        .style("top", (event.pageY) + "px")
        // the text in the box
        .text(
          `Date: ${d.year}-${String(d.month + 1).padStart(2, "0")} max: ${d3.max(d.dailyData, v => v.max)} min: ${d3.min(d.dailyData, v => v.min)}`
        );
    })
    .on("mouseleave", () => tooltip.style("display", "none"));


  // draw two daily temperature lines inside every cell
  cells2.forEach(cell => {
    const dailyData = cell.dailyData //all daily data
      .slice()
      .sort((a, b) => a.date - b.date);

    if (dailyData.length < 2) return;

    // cell position and size
    const cellX = x2(cell.year);
    const cellY = y2(cell.month);
    const cellWidth = x2.bandwidth();
    const cellHeight = y2.bandwidth();

    // X scale: day of the month
    const xMini = d3.scaleLinear()
      .domain([1, 31]) // for days from 1 to 31
      .range([cellX + 3, cellX + cellWidth - 3]); //+3 and -3 to not touch the borders

    // Y scale: same temperature range for all cells
    const yMini = d3.scaleLinear()
      .domain([minDailyTemp, maxDailyTemp]) // temp range
      .range([cellY + cellHeight - 3, cellY + 3]); //+3 and -3 to not touch the borders

    /// the line trends

    // Maximum temperature line
    const maxLine = d3.line()
      .x(d => xMini(d.date.getDate()))
      .y(d => yMini(d.max));

    // Minimum temperature line
    const minLine = d3.line()
      .x(d => xMini(d.date.getDate()))
      .y(d => yMini(d.min));

    // the maximum temperatures in green
    svg2.append("path")
      .datum(dailyData)
      .attr("d", maxLine)
      .attr("fill", "none")
      .attr("stroke", "#54A65A")
      .attr("stroke-width", 1.5)
      .attr("stroke-linejoin", "round")
      .attr("stroke-linecap", "round");

    // the minimum temperatures in blue
    svg2.append("path")
      .datum(dailyData)
      .attr("d", minLine)
      .attr("fill", "none")
      .attr("stroke", "#78C8E8")
      .attr("stroke-width", 1.5)
      .attr("stroke-linejoin", "round")
      .attr("stroke-linecap", "round");
  });

  // Level 2 color legend
  const legend2 = svg2.append("g")
    .attr("transform", `translate(${margin.left}, ${level2Height - 25})`);

  const legendColors = colorMax3.range();

  legend2.selectAll("rect")
    .data(legendColors)
    .join("rect")
    .attr("x", (d, i) => i * 27)
    .attr("y", 0)
    .attr("width", 27)
    .attr("height", 12)
    .attr("fill", d => d);

  legend2.append("text")
    .attr("x", 0)
    .attr("y", -5)
    .attr("font-size", 12)
    .text("0°C");

  legend2.append("text")
    .attr("x", 297)
    .attr("y", -5)
    .attr("text-anchor", "end")
    .attr("font-size", 12)
    .text("40°C");

});