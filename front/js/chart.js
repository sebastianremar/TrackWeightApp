function renderChart(entries) {
    var container = document.getElementById('chart-container');
    container.innerHTML = '';

    // Remove existing tooltip
    var oldTooltip = document.querySelector('.chart-tooltip');
    if (oldTooltip) oldTooltip.remove();

    if (!entries || entries.length === 0) {
        container.innerHTML = '<p class="empty-chart">No weight entries yet. Log your first weight above!</p>';
        return;
    }

    var margin = { top: 20, right: 30, bottom: 40, left: 50 };
    var width = container.clientWidth - margin.left - margin.right;
    var height = 300 - margin.top - margin.bottom;

    if (width < 100) width = 300;

    // Accessible data summary
    var summary = document.createElement('div');
    summary.className = 'sr-only';
    var latest = entries[entries.length - 1];
    var first = entries[0];
    summary.textContent = 'Weight chart showing ' + entries.length + ' entries from ' + first.date + ' to ' + latest.date + '. Latest: ' + latest.weight + ' kg.';
    container.appendChild(summary);

    var svg = d3.select('#chart-container')
        .append('svg')
        .attr('role', 'img')
        .attr('aria-label', 'Weight trend chart with ' + entries.length + ' data points')
        .attr('viewBox', '0 0 ' + (width + margin.left + margin.right) + ' ' + (height + margin.top + margin.bottom))
        .append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    var parseDate = d3.timeParse('%Y-%m-%d');
    var data = entries.map(function(d) {
        return { date: parseDate(d.date), weight: d.weight };
    });

    // Scales
    var x = d3.scaleTime()
        .domain(d3.extent(data, function(d) { return d.date; }))
        .range([0, width]);

    var yExtent = d3.extent(data, function(d) { return d.weight; });
    var yPadding = Math.max((yExtent[1] - yExtent[0]) * 0.15, 1);
    var y = d3.scaleLinear()
        .domain([yExtent[0] - yPadding, yExtent[1] + yPadding])
        .range([height, 0]);

    // Grid lines
    svg.append('g')
        .attr('class', 'grid')
        .call(d3.axisLeft(y)
            .ticks(5)
            .tickSize(-width)
            .tickFormat('')
        );

    // X axis
    var tickCount = Math.min(data.length, 8);
    svg.append('g')
        .attr('class', 'axis')
        .attr('transform', 'translate(0,' + height + ')')
        .call(d3.axisBottom(x)
            .ticks(tickCount)
            .tickFormat(d3.timeFormat('%b %d'))
        );

    // Y axis
    svg.append('g')
        .attr('class', 'axis')
        .call(d3.axisLeft(y)
            .ticks(5)
            .tickFormat(function(d) { return d + ' kg'; })
        );

    // Line
    var line = d3.line()
        .x(function(d) { return x(d.date); })
        .y(function(d) { return y(d.weight); })
        .curve(d3.curveMonotoneX);

    var path = svg.append('path')
        .datum(data)
        .attr('fill', 'none')
        .attr('stroke', '#667eea')
        .attr('stroke-width', 2.5)
        .attr('d', line);

    // Animate line drawing
    var totalLength = path.node().getTotalLength();
    path.attr('stroke-dasharray', totalLength + ' ' + totalLength)
        .attr('stroke-dashoffset', totalLength)
        .transition()
        .duration(800)
        .ease(d3.easeQuadOut)
        .attr('stroke-dashoffset', 0);

    // Area fill under line
    var area = d3.area()
        .x(function(d) { return x(d.date); })
        .y0(height)
        .y1(function(d) { return y(d.weight); })
        .curve(d3.curveMonotoneX);

    svg.append('path')
        .datum(data)
        .attr('fill', 'url(#areaGradient)')
        .attr('d', area)
        .attr('opacity', 0)
        .transition()
        .delay(400)
        .duration(400)
        .attr('opacity', 1);

    // Area gradient
    var defs = svg.append('defs');
    var gradient = defs.append('linearGradient')
        .attr('id', 'areaGradient')
        .attr('x1', '0%').attr('y1', '0%')
        .attr('x2', '0%').attr('y2', '100%');
    gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', '#667eea')
        .attr('stop-opacity', 0.2);
    gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', '#667eea')
        .attr('stop-opacity', 0.02);

    // Tooltip
    var tooltip = d3.select('body')
        .append('div')
        .attr('class', 'chart-tooltip');

    // Dots
    svg.selectAll('.chart-dot')
        .data(data)
        .enter()
        .append('circle')
        .attr('class', 'chart-dot')
        .attr('cx', function(d) { return x(d.date); })
        .attr('cy', function(d) { return y(d.weight); })
        .attr('r', 4)
        .on('mouseover', function(event, d) {
            tooltip.style('opacity', 1)
                .html(d3.timeFormat('%b %d, %Y')(d.date) + '<br><strong>' + d.weight + ' kg</strong>')
                .style('left', (event.pageX + 12) + 'px')
                .style('top', (event.pageY - 36) + 'px');
        })
        .on('mousemove', function(event) {
            tooltip.style('left', (event.pageX + 12) + 'px')
                .style('top', (event.pageY - 36) + 'px');
        })
        .on('mouseout', function() {
            tooltip.style('opacity', 0);
        });

    // Single data point — show larger dot
    if (data.length === 1) {
        svg.selectAll('.chart-dot').attr('r', 6);
    }
}

// Comparison chart — two lines overlaid
function renderCompareChart(myEntries, friendEntries, friendName) {
    // Remove any existing overlay
    var existing = document.querySelector('.compare-overlay');
    if (existing) existing.remove();

    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay compare-overlay';

    var card = document.createElement('div');
    card.className = 'modal';
    card.style.maxWidth = '600px';

    var header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.marginBottom = '16px';

    var title = document.createElement('h3');
    title.textContent = 'Weight Comparison';

    var closeBtn = document.createElement('button');
    closeBtn.className = 'confirm-btn confirm-cancel';
    closeBtn.textContent = 'Close';
    closeBtn.style.flex = '0';
    closeBtn.style.padding = '8px 16px';
    closeBtn.addEventListener('click', function() {
        overlay.remove();
        var tt = document.querySelector('.chart-tooltip');
        if (tt) tt.remove();
    });

    header.appendChild(title);
    header.appendChild(closeBtn);
    card.appendChild(header);

    var chartDiv = document.createElement('div');
    chartDiv.id = 'compare-chart';
    chartDiv.style.width = '100%';
    chartDiv.style.minHeight = '300px';
    card.appendChild(chartDiv);

    // Legend
    var legend = document.createElement('div');
    legend.className = 'chart-legend';

    var myLegend = document.createElement('div');
    myLegend.className = 'legend-item';
    var myColor = document.createElement('div');
    myColor.className = 'legend-color';
    myColor.style.backgroundColor = '#667eea';
    var myLabel = document.createElement('span');
    myLabel.textContent = 'You';
    myLegend.appendChild(myColor);
    myLegend.appendChild(myLabel);

    var friendLegend = document.createElement('div');
    friendLegend.className = 'legend-item';
    var friendColor = document.createElement('div');
    friendColor.className = 'legend-color';
    friendColor.style.backgroundColor = '#e74c3c';
    var friendLabel = document.createElement('span');
    friendLabel.textContent = friendName;
    friendLegend.appendChild(friendColor);
    friendLegend.appendChild(friendLabel);

    legend.appendChild(myLegend);
    legend.appendChild(friendLegend);
    card.appendChild(legend);

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    // Now render with D3
    var parseDate = d3.timeParse('%Y-%m-%d');
    var myData = myEntries.map(function(d) { return { date: parseDate(d.date), weight: d.weight }; });
    var friendData = friendEntries.map(function(d) { return { date: parseDate(d.date), weight: d.weight }; });
    var allData = myData.concat(friendData);

    if (allData.length === 0) return;

    var margin = { top: 20, right: 30, bottom: 40, left: 50 };
    var containerEl = document.getElementById('compare-chart');
    var width = containerEl.clientWidth - margin.left - margin.right;
    var height = 280 - margin.top - margin.bottom;
    if (width < 100) width = 300;

    var svg = d3.select('#compare-chart')
        .append('svg')
        .attr('role', 'img')
        .attr('aria-label', 'Weight comparison chart between you and ' + friendName)
        .attr('viewBox', '0 0 ' + (width + margin.left + margin.right) + ' ' + (height + margin.top + margin.bottom))
        .append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    var x = d3.scaleTime()
        .domain(d3.extent(allData, function(d) { return d.date; }))
        .range([0, width]);

    var yExtent = d3.extent(allData, function(d) { return d.weight; });
    var yPadding = Math.max((yExtent[1] - yExtent[0]) * 0.15, 1);
    var y = d3.scaleLinear()
        .domain([yExtent[0] - yPadding, yExtent[1] + yPadding])
        .range([height, 0]);

    // Grid
    svg.append('g')
        .attr('class', 'grid')
        .call(d3.axisLeft(y).ticks(5).tickSize(-width).tickFormat(''));

    // Axes
    svg.append('g')
        .attr('class', 'axis')
        .attr('transform', 'translate(0,' + height + ')')
        .call(d3.axisBottom(x).ticks(6).tickFormat(d3.timeFormat('%b %d')));

    svg.append('g')
        .attr('class', 'axis')
        .call(d3.axisLeft(y).ticks(5).tickFormat(function(d) { return d + ' kg'; }));

    var line = d3.line()
        .x(function(d) { return x(d.date); })
        .y(function(d) { return y(d.weight); })
        .curve(d3.curveMonotoneX);

    // My line
    if (myData.length > 0) {
        svg.append('path')
            .datum(myData)
            .attr('fill', 'none')
            .attr('stroke', '#667eea')
            .attr('stroke-width', 2.5)
            .attr('d', line);
    }

    // Friend line
    if (friendData.length > 0) {
        svg.append('path')
            .datum(friendData)
            .attr('fill', 'none')
            .attr('stroke', '#e74c3c')
            .attr('stroke-width', 2.5)
            .attr('stroke-dasharray', '6,3')
            .attr('d', line);
    }
}
